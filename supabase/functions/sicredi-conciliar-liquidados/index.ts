import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, listarLiquidadosDoDia, consultarPorNossoNumero,
  type ConfigIntegracao, type BoletoLiquidado,
} from "../_shared/sicredi.ts";
import { casarLiquidacaoExterna, type ParcelaCandidata } from "../_shared/sicredi-core.ts";

// Rede de segurança do webhook: pergunta ao Sicredi o que foi liquidado nos últimos dias e dá baixa
// no que o webhook não entregou. É idempotente (título já Pago não é tocado).
// verify_jwt = false (cron sem JWT); a função valida sozinha, como a sicredi-processar-fila:
//  - cron: x-cron-secret conferido no banco (Vault). Roda em todas as escolas em PRODUÇÃO
//    (ou só na escola informada em { escola_id }, qualquer ambiente);
//  - tela: usuário logado com permissão na escola informada.
const DIAS_PARA_TRAS = 3; // hoje + 2 anteriores: cobre o Pix de fim de semana lançado no dia útil seguinte
const MAX_DIAS_SIMULACAO = 15;
const MAX_CONSULTAS_SIMULACAO = 60;

// Modo "simular" ({ modo: "simular", dias? }): NÃO baixa nada. Para cada liquidado que não existe no financeiro (boleto
// emitido no Internet Banking), consulta o nosso número no Sicredi e diz qual parcela seria escolhida. Dados pessoais saem mascarados.
const primeiroNome = (n: string | null | undefined) => String(n ?? "").trim().split(/\s+/)[0] ?? "";
const mascarar = (doc: string | null) => (doc ? `***${doc.slice(-2)}` : null);

async function candidatasDoVencimento(admin: ReturnType<typeof clienteAdmin>, escolaId: string, vencimento: string): Promise<ParcelaCandidata[]> {
  const { data } = await admin.from("financeiro")
    .select("id, valor, valor_integral, data_vencimento, gateway_status, matriculas ( alunos ( nome, responsavel_cpf ) )")
    .eq("escola_id", escolaId).eq("data_vencimento", vencimento).in("status", ["Pendente", "Atrasado"]).limit(2000);
  // deno-lint-ignore no-explicit-any
  return (data ?? []).map((t: any) => ({
    id: t.id, valor: Number(t.valor), valor_integral: t.valor_integral == null ? null : Number(t.valor_integral),
    data_vencimento: t.data_vencimento, documento_responsavel: t.matriculas?.alunos?.responsavel_cpf ?? null,
    aluno: t.matriculas?.alunos?.nome ?? null, tem_boleto_api: t.gateway_status === "registrado",
  }));
}

async function simularExternas(admin: ReturnType<typeof clienteAdmin>, cfg: ConfigIntegracao, escolaId: string, porNN: Map<string, BoletoLiquidado>) {
  const nns = [...porNN.keys()];
  const conhecidos = new Set<string>();
  for (let i = 0; i < nns.length; i += 200) {
    const { data } = await admin.from("financeiro").select("gateway_cobranca_id").eq("escola_id", escolaId).in("gateway_cobranca_id", nns.slice(i, i + 200));
    for (const r of data ?? []) conhecidos.add(r.gateway_cobranca_id as string);
  }
  const desconhecidos = nns.filter((n) => !conhecidos.has(n));
  const alvo = desconhecidos.slice(0, MAX_CONSULTAS_SIMULACAO);
  const cacheVenc = new Map<string, ParcelaCandidata[]>();
  const resultados: Record<string, unknown>[] = [];

  const fila = [...alvo];
  await Promise.all(Array.from({ length: Math.min(3, fila.length) }, async () => {
    for (let nn = fila.shift(); nn; nn = fila.shift()) {
      const liq = porNN.get(nn)!;
      const base = { prefixo: nn.slice(0, 2), valor_pago: liq.valorLiquidado, data_pagamento: liq.dataPagamento };
      try {
        const dados = await consultarPorNossoNumero(admin, cfg, nn);
        if (!dados) { resultados.push({ ...base, resultado: "nenhum", motivo: "O Sicredi não devolveu os dados deste nosso número." }); continue; }
        let cand = dados.vencimento ? cacheVenc.get(dados.vencimento) : [];
        if (dados.vencimento && !cand) { cand = await candidatasDoVencimento(admin, escolaId, dados.vencimento); cacheVenc.set(dados.vencimento, cand); }
        const r = casarLiquidacaoExterna(dados, cand ?? []);
        const comum = { ...base, pagador: primeiroNome(dados.nomePagador), documento: mascarar(dados.documentoPagador), vencimento: dados.vencimento, valor_nominal: dados.valorNominal };
        if (r.tipo === "unico") resultados.push({ ...comum, resultado: "unico", aluno: primeiroNome(r.parcela.aluno), tem_boleto_api: r.parcela.tem_boleto_api });
        else if (r.tipo === "ambiguo") resultados.push({ ...comum, resultado: "ambiguo", alunos: r.parcelas.map((p) => primeiroNome(p.aluno)) });
        else resultados.push({ ...comum, resultado: "nenhum", motivo: r.motivo });
      } catch (e) {
        resultados.push({ ...base, resultado: "erro", motivo: (e instanceof Error ? e.message : String(e)).slice(0, 160) });
      }
    }
  }));

  const contagem = (t: string) => resultados.filter((r) => r.resultado === t).length;
  return {
    liquidados: nns.length, ja_no_sistema: conhecidos.size, sem_parcela: desconhecidos.length, consultados: alvo.length,
    unico: contagem("unico"), ambiguo: contagem("ambiguo"), nenhum: contagem("nenhum"), erro: contagem("erro"), resultados,
  };
}

const ddmmyyyy = (d: Date) => {
  const p = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })
    .formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("day")}/${g("month")}/${g("year")}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = clienteAdmin();
  let escolaId: string | null = null;
  let modo: string | null = null;
  let diasPedidos: number | null = null;
  try {
    const corpo = await req.json();
    escolaId = corpo?.escola_id ?? null;
    modo = corpo?.modo ?? null;
    diasPedidos = Number.isFinite(Number(corpo?.dias)) ? Number(corpo.dias) : null;
  } catch { /* sem corpo */ }
  const simular = modo === "simular";
  const diasConsulta = simular ? Math.min(Math.max(diasPedidos ?? DIAS_PARA_TRAS, 1), MAX_DIAS_SIMULACAO) : DIAS_PARA_TRAS;

  const segredo = req.headers.get("x-cron-secret");
  if (segredo) {
    const { data: ok } = await admin.rpc("sicredi_cron_ok", { p_segredo: segredo });
    if (ok !== true) return json({ ok: false, erro: "Não autorizado" }, 401);
  } else {
    if (!escolaId) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);
    if (!(await usuarioTemPermissao(req, escolaId, "financeiro", "editar"))) {
      return json({ ok: false, erro: "Você não tem permissão para conciliar boletos desta escola." }, 403);
    }
  }

  let alvo = admin.from("escolas_integracao_bancaria").select("escola_id").eq("ativo", true);
  alvo = escolaId ? alvo.eq("escola_id", escolaId) : alvo.eq("ambiente", "producao");
  const { data: escolas, error } = await alvo;
  if (error) return json({ ok: false, erro: error.message }, 500);

  const resumo: Record<string, unknown>[] = [];

  for (const { escola_id } of escolas ?? []) {
    const item: { escola_id: string; consultados: number; baixados: number; erro: string | null; simulacao?: unknown } =
      { escola_id, consultados: 0, baixados: 0, erro: null };
    try {
      const cfg: ConfigIntegracao = await carregarConfig(admin, escola_id);
      const chave = `${cfg.agencia.replace(/\D/g, "")}-${cfg.posto.replace(/\D/g, "")}-${cfg.codigo_beneficiario.replace(/\D/g, "")}`;

      // 1) tudo que o banco liquidou nos últimos dias (sem repetir nosso número)
      const porNN = new Map<string, { nossoNumero: string; valorLiquidado: number; dataPagamento: string; tipoLiquidacao: string }>();
      for (let i = 0; i < diasConsulta; i++) {
        const dia = ddmmyyyy(new Date(Date.now() - i * 86_400_000));
        for (const b of await listarLiquidadosDoDia(admin, cfg, dia)) porNN.set(b.nossoNumero, b);
      }
      item.consultados = porNN.size;

      if (simular) {
        item.simulacao = await simularExternas(admin, cfg, escola_id, porNN);
        resumo.push(item);
        continue;
      }

      // 2) só interessa o que existe aqui e ainda NÃO está pago (consulta em lote, 200 por vez)
      const nns = [...porNN.keys()];
      for (let i = 0; i < nns.length; i += 200) {
        const { data: abertos, error: errT } = await admin.from("financeiro").select("id, gateway_cobranca_id")
          .eq("escola_id", escola_id).in("gateway_cobranca_id", nns.slice(i, i + 200)).neq("status", "Pago");
        if (errT) { item.erro = errT.message.slice(0, 200); continue; }

        for (const t of abertos ?? []) {
          const b = porNN.get(t.gateway_cobranca_id as string)!;
          const idEvento = `poll:${b.nossoNumero}:${b.dataPagamento}`;
          const { data: tituloId, error: errBaixa } = await admin.rpc("baixar_titulo_por_cobranca_bancaria", {
            p_escola_id: escola_id,
            p_gateway_cobranca_id: b.nossoNumero,
            p_valor_pago: b.valorLiquidado,
            p_data_pagamento: b.dataPagamento,
            p_conta_bancaria_id: cfg.conta_bancaria_id,
            p_forma_pagamento: /PIX/i.test(b.tipoLiquidacao) ? "Pix" : "Boleto",
            p_ref_evento: `sicredi:${idEvento}`,
          });
          if (errBaixa) { item.erro = errBaixa.message.slice(0, 200); continue; } // tenta de novo na próxima rodada
          if (!tituloId) continue;
          item.baixados++;
          await admin.from("cobranca_eventos").upsert({
            escola_id, chave_beneficiario: chave, id_evento: idEvento, movimento: `CONSULTA_${b.tipoLiquidacao || "LIQUIDADO"}`,
            nosso_numero: b.nossoNumero, payload: b, status: "processado",
            detalhe: "Baixa pela consulta diária (o webhook não entregou).",
          }, { onConflict: "chave_beneficiario,id_evento", ignoreDuplicates: true });
        }
      }
    } catch (e) {
      item.erro = e instanceof Error ? e.message.slice(0, 300) : String(e);
    }
    resumo.push(item);
  }

  return json({ ok: true, escolas: resumo });
});
