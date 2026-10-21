import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, listarLiquidadosDoDia, consultarPorNossoNumero,
  type ConfigIntegracao, type BoletoLiquidado,
} from "../_shared/sicredi.ts";
import { casarLiquidacaoExterna, somenteDigitos, type ParcelaCandidata, type DadosBoletoConsultado } from "../_shared/sicredi-core.ts";

// Rede de segurança do webhook: pergunta ao Sicredi o que foi liquidado nos últimos dias e dá baixa
// no que o webhook não entregou. É idempotente (título já Pago não é tocado).
// verify_jwt = false (cron sem JWT); a função valida sozinha, como a sicredi-processar-fila:
//  - cron: x-cron-secret conferido no banco (Vault). Roda em todas as escolas em PRODUÇÃO
//    (ou só na escola informada em { escola_id }, qualquer ambiente);
//  - tela: usuário logado com permissão na escola informada.
const DIAS_PARA_TRAS = 3; // hoje + 2 anteriores: cobre o Pix de fim de semana lançado no dia útil seguinte
const MAX_DIAS_SIMULACAO = 15;
const MAX_CONSULTAS_SIMULACAO = 120;
const MAX_INICIO_DIAS = 180; // { inicio } desloca a janela para trás (retroativo); sem ele a janela começa hoje

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

type Candidato = { id: string; aluno: string | null; valor: number; valor_integral: number | null };
const paraCandidato = (p: ParcelaCandidata): Candidato => ({ id: p.id, aluno: p.aluno, valor: p.valor, valor_integral: p.valor_integral });

/**
 * Boletos emitidos fora do sistema. aplicar=false (modo "simular"): só lê e devolve o que faria.
 * aplicar=true: baixa o caso ÚNICO (mesmo CPF + vencimento + valor) e grava o resto em liquidacoes_externas para conferência.
 */
async function processarExternas(
  admin: ReturnType<typeof clienteAdmin>, cfg: ConfigIntegracao, escolaId: string, chave: string,
  porNN: Map<string, BoletoLiquidado>, aplicar: boolean, gravarResto = aplicar
) {
  const nns = [...porNN.keys()];
  const conhecidos = new Set<string>();
  for (let i = 0; i < nns.length; i += 200) {
    const { data } = await admin.from("financeiro").select("gateway_cobranca_id").eq("escola_id", escolaId).in("gateway_cobranca_id", nns.slice(i, i + 200));
    for (const r of data ?? []) conhecidos.add(r.gateway_cobranca_id as string);
  }
  // já tratados (baixados, resolvidos ou ignorados) não voltam; os que seguem em "conferir" são reavaliados
  const tratados = new Set<string>();
  if (aplicar) {
    for (let i = 0; i < nns.length; i += 200) {
      const { data } = await admin.from("liquidacoes_externas").select("nosso_numero, situacao").eq("escola_id", escolaId).in("nosso_numero", nns.slice(i, i + 200));
      for (const r of data ?? []) if (r.situacao !== "conferir") tratados.add(r.nosso_numero as string);
    }
  }
  const desconhecidos = nns.filter((n) => !conhecidos.has(n) && !tratados.has(n));
  const alvo = desconhecidos.slice(0, MAX_CONSULTAS_SIMULACAO);
  const cacheVenc = new Map<string, ParcelaCandidata[]>();
  const resultados: Record<string, unknown>[] = [];

  const gravar = (liq: BoletoLiquidado, dados: DadosBoletoConsultado | null, campos: Record<string, unknown>) =>
    admin.from("liquidacoes_externas").upsert({
      escola_id: escolaId, nosso_numero: liq.nossoNumero, data_pagamento: liq.dataPagamento || null, valor_pago: liq.valorLiquidado,
      tipo_liquidacao: liq.tipoLiquidacao || null, pagador_nome: dados?.nomePagador ?? null,
      pagador_doc_final: dados?.documentoPagador ? dados.documentoPagador.slice(-2) : null,
      vencimento: dados?.vencimento ?? null, valor_nominal: dados?.valorNominal ?? null, atualizado_em: new Date().toISOString(), ...campos,
    }, { onConflict: "escola_id,nosso_numero" });

  const fila = [...alvo];
  const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await Promise.all(Array.from({ length: Math.min(2, fila.length) }, async () => {
    for (let nn = fila.shift(); nn; nn = fila.shift()) {
      await dormir(150);
      const liq = porNN.get(nn)!;
      const base = { prefixo: nn.slice(0, 2), valor_pago: liq.valorLiquidado, data_pagamento: liq.dataPagamento };
      try {
        const dados = await consultarPorNossoNumero(admin, cfg, nn);
        if (!dados) { resultados.push({ ...base, resultado: "erro", motivo: "O Sicredi não devolveu os dados deste nosso número." }); continue; }
        const comum = { ...base, pagador: primeiroNome(dados.nomePagador), documento: mascarar(dados.documentoPagador), vencimento: dados.vencimento, valor_nominal: dados.valorNominal };

        // boleto registrado pela API que não está em nenhuma parcela: não é "boleto manual", é algo a investigar
        if (dados.idTituloEmpresa) {
          resultados.push({ ...comum, resultado: "api_sem_parcela" });
          if (gravarResto) await gravar(liq, dados, { resultado: "api_sem_parcela", motivo: "Boleto registrado pela API sem parcela correspondente no sistema.", situacao: "conferir", candidatos: [] });
          continue;
        }

        let cand = dados.vencimento ? cacheVenc.get(dados.vencimento) : [];
        if (dados.vencimento && !cand) { cand = await candidatasDoVencimento(admin, escolaId, dados.vencimento); cacheVenc.set(dados.vencimento, cand); }
        const r = casarLiquidacaoExterna(dados, cand ?? []);

        if (r.tipo === "unico") {
          let baixada = false;
          if (aplicar) {
            const { data: tituloId, error: errBaixa } = await admin.rpc("baixar_parcela_por_boleto_externo", {
              p_escola_id: escolaId, p_financeiro_id: r.parcela.id, p_nosso_numero: nn, p_valor_pago: liq.valorLiquidado,
              p_data_pagamento: liq.dataPagamento, p_conta_bancaria_id: cfg.conta_bancaria_id,
              p_forma_pagamento: /PIX/i.test(liq.tipoLiquidacao) ? "Pix" : "Boleto", p_ref_evento: `sicredi:poll-externo:${nn}:${liq.dataPagamento}`,
            });
            if (errBaixa) throw new Error(errBaixa.message);
            baixada = !!tituloId;
            if (baixada) {
              await gravar(liq, dados, { resultado: "unico", motivo: null, situacao: "baixada", financeiro_id: tituloId, candidatos: [], resolvido_em: new Date().toISOString() });
              await admin.from("cobranca_eventos").upsert({
                escola_id: escolaId, chave_beneficiario: chave, id_evento: `poll-externo:${nn}:${liq.dataPagamento}`,
                movimento: `CONSULTA_EXTERNO_${liq.tipoLiquidacao || "LIQUIDADO"}`, nosso_numero: nn, payload: liq, status: "processado",
                detalhe: "Baixa de boleto emitido fora do sistema (casado por CPF, vencimento e valor).",
              }, { onConflict: "chave_beneficiario,id_evento", ignoreDuplicates: true });
            } else {
              if (gravarResto) await gravar(liq, dados, { resultado: "nenhum", motivo: "A parcela encontrada deixou de estar em aberto.", situacao: "conferir", candidatos: [paraCandidato(r.parcela)] });
            }
          }
          resultados.push({ ...comum, resultado: "unico", aluno: primeiroNome(r.parcela.aluno), tem_boleto_api: r.parcela.tem_boleto_api, baixada });
        } else if (r.tipo === "ambiguo") {
          resultados.push({ ...comum, resultado: "ambiguo", alunos: r.parcelas.map((p) => primeiroNome(p.aluno)) });
          if (gravarResto) await gravar(liq, dados, { resultado: "ambiguo", motivo: "Mais de uma parcela com o mesmo CPF, vencimento e valor.", situacao: "conferir", candidatos: r.parcelas.map(paraCandidato) });
        } else {
          resultados.push({ ...comum, resultado: "nenhum", motivo: r.motivo });
          if (gravarResto) await gravar(liq, dados, { resultado: "nenhum", motivo: r.motivo, situacao: "conferir", candidatos: (r.proximas ?? []).map(paraCandidato) });
        }
      } catch (e) {
        resultados.push({ ...base, resultado: "erro", motivo: (e instanceof Error ? e.message : String(e)).slice(0, 160) });
      }
    }
  }));

  const contagem = (t: string) => resultados.filter((r) => r.resultado === t).length;
  return {
    aplicado: aplicar, liquidados: nns.length, ja_no_sistema: conhecidos.size, ja_tratados: tratados.size, sem_parcela: desconhecidos.length,
    consultados: alvo.length, unico: contagem("unico"), baixadas: resultados.filter((r) => r.baixada === true).length,
    ambiguo: contagem("ambiguo"), nenhum: contagem("nenhum"), api_sem_parcela: contagem("api_sem_parcela"), erro: contagem("erro"), resultados,
  };
}

/**
 * Baixa pontual de boleto manual por nosso número + parcela EXPLÍCITA (lista aprovada pelo usuário). Serve para pagamentos cujo
 * valor difere por centavos do cadastro (o casamento exato não pega). Revalida no banco: mesmo CPF do responsável, mesmo
 * vencimento e valor nominal a até R$ 1,00 do valor/integral da parcela. Nada fora da lista é tocado.
 */
async function baixarPorNossoNumero(
  admin: ReturnType<typeof clienteAdmin>, cfg: ConfigIntegracao, escolaId: string, chave: string,
  porNN: Map<string, BoletoLiquidado>, itens: { nosso_numero: string; financeiro_id: string }[]
) {
  const resultados: Record<string, unknown>[] = [];
  const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const it of itens) {
    const liq = porNN.get(it.nosso_numero);
    if (!liq) continue; // fora desta janela de dias
    const nn = it.nosso_numero;
    try {
      await dormir(150);
      const dados = await consultarPorNossoNumero(admin, cfg, nn);
      const { data: p } = await admin.from("financeiro")
        .select("id, valor, valor_integral, data_vencimento, status, matriculas ( alunos ( responsavel_cpf ) )")
        .eq("id", it.financeiro_id).eq("escola_id", escolaId).maybeSingle();
      // deno-lint-ignore no-explicit-any
      const cpf = somenteDigitos((p as any)?.matriculas?.alunos?.responsavel_cpf);
      if (!dados || !p) { resultados.push({ nn, resultado: "recusado", motivo: "boleto ou parcela não encontrados" }); continue; }
      if (dados.idTituloEmpresa) { resultados.push({ nn, resultado: "recusado", motivo: "boleto registrado pela API" }); continue; }
      if (!cpf || somenteDigitos(dados.documentoPagador) !== cpf) { resultados.push({ nn, resultado: "recusado", motivo: "CPF do pagador diferente do responsável" }); continue; }
      if (dados.vencimento !== p.data_vencimento) { resultados.push({ nn, resultado: "recusado", motivo: "vencimento diferente" }); continue; }
      const nominal = Number(dados.valorNominal);
      const dif = Math.min(Math.abs(nominal - Number(p.valor)), Math.abs(nominal - Number(p.valor_integral ?? p.valor)));
      if (!Number.isFinite(dif) || dif > 1.0) { resultados.push({ nn, resultado: "recusado", motivo: "valor difere mais de R$ 1,00" }); continue; }
      if (p.status !== "Pendente" && p.status !== "Atrasado" && p.status !== "Pago") { resultados.push({ nn, resultado: "recusado", motivo: "parcela " + p.status }); continue; }

      const { data: tituloId, error: errBaixa } = await admin.rpc("baixar_parcela_por_boleto_externo", {
        p_escola_id: escolaId, p_financeiro_id: it.financeiro_id, p_nosso_numero: nn, p_valor_pago: liq.valorLiquidado,
        p_data_pagamento: liq.dataPagamento, p_conta_bancaria_id: cfg.conta_bancaria_id,
        p_forma_pagamento: /PIX/i.test(liq.tipoLiquidacao) ? "Pix" : "Boleto", p_ref_evento: `sicredi:poll-externo:${nn}:${liq.dataPagamento}`,
      });
      if (errBaixa) throw new Error(errBaixa.message);
      if (!tituloId) { resultados.push({ nn, resultado: "recusado", motivo: "a parcela não está em aberto" }); continue; }
      await admin.from("liquidacoes_externas").upsert({
        escola_id: escolaId, nosso_numero: nn, data_pagamento: liq.dataPagamento || null, valor_pago: liq.valorLiquidado,
        tipo_liquidacao: liq.tipoLiquidacao || null, pagador_nome: dados.nomePagador, pagador_doc_final: cpf.slice(-2),
        vencimento: dados.vencimento, valor_nominal: dados.valorNominal, resultado: "unico", motivo: "Baixa por lista aprovada (valor com diferença de centavos).",
        situacao: "baixada", financeiro_id: tituloId, candidatos: [], resolvido_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
      }, { onConflict: "escola_id,nosso_numero" });
      await admin.from("cobranca_eventos").upsert({
        escola_id: escolaId, chave_beneficiario: chave, id_evento: `poll-externo:${nn}:${liq.dataPagamento}`,
        movimento: `CONSULTA_EXTERNO_${liq.tipoLiquidacao || "LIQUIDADO"}`, nosso_numero: nn, payload: liq, status: "processado",
        detalhe: "Baixa de boleto emitido fora do sistema por lista aprovada (CPF e vencimento conferem; valor a até R$ 1,00).",
      }, { onConflict: "chave_beneficiario,id_evento", ignoreDuplicates: true });
      resultados.push({ nn, resultado: "baixada", data_pagamento: liq.dataPagamento, valor_pago: liq.valorLiquidado, dif: Math.round(dif * 100) / 100 });
    } catch (e) {
      resultados.push({ nn, resultado: "erro", motivo: (e instanceof Error ? e.message : String(e)).slice(0, 160) });
    }
  }
  return resultados;
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
  let inicioPedido = 0;
  let permitir: { data: string; valor: number }[] | null = null;
  let itensNN: { nosso_numero: string; financeiro_id: string }[] | null = null;
  try {
    const corpo = await req.json();
    escolaId = corpo?.escola_id ?? null;
    modo = corpo?.modo ?? null;
    diasPedidos = Number.isFinite(Number(corpo?.dias)) ? Number(corpo.dias) : null;
    inicioPedido = Number.isFinite(Number(corpo?.inicio)) ? Math.min(Math.max(Math.trunc(Number(corpo.inicio)), 0), MAX_INICIO_DIAS) : 0;
    if (Array.isArray(corpo?.permitir)) {
      permitir = corpo.permitir.map((x: { data?: string; valor?: number }) => ({ data: String(x?.data ?? ""), valor: Number(x?.valor) }));
    }
    if (Array.isArray(corpo?.itens)) {
      itensNN = corpo.itens.map((x: { nosso_numero?: string; financeiro_id?: string }) => ({ nosso_numero: String(x?.nosso_numero ?? ""), financeiro_id: String(x?.financeiro_id ?? "") }));
    }
  } catch { /* sem corpo */ }
  const simular = modo === "simular";
  // Baixa retroativa e pontual: só o que estiver na lista "permitir" (data do pagamento + valor), uma escola por vez,
  // sem ligar a baixa automática e sem gravar na conferência o que não casou.
  const baixarRetro = modo === "baixar_retroativo";
  const baixarNN = modo === "baixar_nn";
  const diasConsulta = (simular || baixarRetro || baixarNN) ? Math.min(Math.max(diasPedidos ?? DIAS_PARA_TRAS, 1), MAX_DIAS_SIMULACAO) : DIAS_PARA_TRAS;

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

  if (baixarRetro && (!escolaId || !permitir || permitir.length === 0)) {
    return json({ ok: false, erro: "A baixa retroativa exige escola_id e a lista permitir (data + valor)." }, 400);
  }

  if (baixarNN && (!escolaId || !itensNN || itensNN.length === 0)) {
    return json({ ok: false, erro: "A baixa por nosso número exige escola_id e a lista itens (nosso_numero + financeiro_id)." }, 400);
  }

  let alvo = admin.from("escolas_integracao_bancaria").select("escola_id").eq("ativo", true);
  alvo = escolaId ? alvo.eq("escola_id", escolaId) : alvo.eq("ambiente", "producao");
  const { data: escolas, error } = await alvo;
  if (error) return json({ ok: false, erro: error.message }, 500);

  const resumo: Record<string, unknown>[] = [];

  for (const { escola_id } of escolas ?? []) {
    const item: { escola_id: string; consultados: number; baixados: number; erro: string | null; simulacao?: unknown; externos?: unknown } =
      { escola_id, consultados: 0, baixados: 0, erro: null };
    try {
      const cfg: ConfigIntegracao = await carregarConfig(admin, escola_id);
      const chave = `${cfg.agencia.replace(/\D/g, "")}-${cfg.posto.replace(/\D/g, "")}-${cfg.codigo_beneficiario.replace(/\D/g, "")}`;

      // 1) tudo que o banco liquidou nos últimos dias (sem repetir nosso número)
      const porNN = new Map<string, { nossoNumero: string; valorLiquidado: number; dataPagamento: string; tipoLiquidacao: string }>();
      for (let i = inicioPedido; i < inicioPedido + diasConsulta; i++) {
        const dia = ddmmyyyy(new Date(Date.now() - i * 86_400_000));
        for (const b of await listarLiquidadosDoDia(admin, cfg, dia)) porNN.set(b.nossoNumero, b);
      }
      if (permitir && (simular || baixarRetro)) {
        for (const [nn, b] of [...porNN]) {
          if (!permitir.some((x) => x.data === b.dataPagamento && Math.abs(x.valor - b.valorLiquidado) < 0.005)) porNN.delete(nn);
        }
      }
      item.consultados = porNN.size;

      if (baixarNN) {
        for (const nn of [...porNN.keys()]) if (!itensNN!.some((x) => x.nosso_numero === nn)) porNN.delete(nn);
        const res = await baixarPorNossoNumero(admin, cfg, escola_id, chave, porNN, itensNN!);
        item.simulacao = { resultados: res, baixadas: res.filter((r) => r.resultado === "baixada").length, recusadas: res.filter((r) => r.resultado === "recusado").length, erros: res.filter((r) => r.resultado === "erro").length };
        item.baixados = res.filter((r) => r.resultado === "baixada").length;
        resumo.push(item);
        continue;
      }

      if (simular) {
        item.simulacao = await processarExternas(admin, cfg, escola_id, chave, porNN, false);
        resumo.push(item);
        continue;
      }

      if (baixarRetro) {
        const ext = await processarExternas(admin, cfg, escola_id, chave, porNN, true, false);
        item.simulacao = ext;
        item.baixados = ext.baixadas;
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

      // 3) boletos emitidos fora do sistema (Internet Banking): só nas escolas com a baixa de boleto manual ligada
      if (cfg.baixa_boleto_manual) {
        const ext = await processarExternas(admin, cfg, escola_id, chave, porNN, true);
        item.externos = { liquidados_sem_parcela: ext.sem_parcela, baixadas: ext.baixadas, ambiguo: ext.ambiguo, nenhum: ext.nenhum, api_sem_parcela: ext.api_sem_parcela, erro: ext.erro };
        item.baixados += ext.baixadas;
      }
    } catch (e) {
      item.erro = e instanceof Error ? e.message.slice(0, 300) : String(e);
    }
    resumo.push(item);
  }

  return json({ ok: true, escolas: resumo });
});
