import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, consultarPorNossoNumero, ErroSicredi,
} from "../_shared/sicredi.ts";
import { casarLiquidacaoExterna, montarNossoNumero, type ParcelaCandidata } from "../_shared/sicredi-core.ts";

// Varredura SOMENTE LEITURA de boletos emitidos no Internet Banking: consulta um nosso número por vez (faixa sequencial
// AA+byte+seq+DV) e diz qual parcela do sistema cada boleto encontrado cobre. Não grava nada. Dados pessoais saem mascarados.
// verify_jwt = false; autoriza como a conciliação: x-cron-secret (Vault) ou usuário com permissão na escola.
const MAX_POR_CHAMADA = 60;
const primeiroNome = (n: string | null | undefined) => String(n ?? "").trim().split(/\s+/)[0] ?? "";
const mascarar = (doc: string | null) => (doc ? `***${doc.slice(-2)}` : null);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = clienteAdmin();

  // deno-lint-ignore no-explicit-any
  let c: any = {};
  try { c = await req.json(); } catch { /* sem corpo */ }
  const escolaId: string | null = c?.escola_id ?? null;
  if (!escolaId) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);

  const segredo = req.headers.get("x-cron-secret");
  if (segredo) {
    const { data: ok } = await admin.rpc("sicredi_cron_ok", { p_segredo: segredo });
    if (ok !== true) return json({ ok: false, erro: "Não autorizado" }, 401);
  } else if (!(await usuarioTemPermissao(req, escolaId, "financeiro", "editar"))) {
    return json({ ok: false, erro: "Você não tem permissão para consultar boletos desta escola." }, 403);
  }

  const ano = String(c?.ano ?? "26").replace(/\D/g, "").padStart(2, "0").slice(-2);
  const byte = Number.isInteger(c?.byte) ? Number(c.byte) : 1;
  const de = Number(c?.de), ate = Number(c?.ate);
  if (!Number.isInteger(de) || !Number.isInteger(ate) || de < 1 || ate < de || ate > 99999) {
    return json({ ok: false, erro: "Informe de/ate (sequenciais entre 1 e 99999, de <= ate)." }, 400);
  }
  if (ate - de + 1 > MAX_POR_CHAMADA) return json({ ok: false, erro: `No máximo ${MAX_POR_CHAMADA} nossos números por chamada.` }, 400);

  try {
    const cfg = await carregarConfig(admin, escolaId);
    const sequenciais = Array.from({ length: ate - de + 1 }, (_, i) => de + i);
    const cacheVenc = new Map<string, ParcelaCandidata[]>();
    const encontrados: Record<string, unknown>[] = [];
    let naoExistem = 0, erros = 0, limite = false;
    const errosDistintos = new Set<string>();

    const candidatas = async (venc: string) => {
      const dado = cacheVenc.get(venc);
      if (dado) return dado;
      const { data } = await admin.from("financeiro")
        .select("id, valor, valor_integral, data_vencimento, gateway_status, matriculas ( alunos ( nome, responsavel_cpf ) )")
        .eq("escola_id", escolaId).eq("data_vencimento", venc).in("status", ["Pendente", "Atrasado"]).limit(2000);
      // deno-lint-ignore no-explicit-any
      const lista: ParcelaCandidata[] = (data ?? []).map((t: any) => ({
        id: t.id, valor: Number(t.valor), valor_integral: t.valor_integral == null ? null : Number(t.valor_integral),
        data_vencimento: t.data_vencimento, documento_responsavel: t.matriculas?.alunos?.responsavel_cpf ?? null,
        aluno: t.matriculas?.alunos?.nome ?? null, tem_boleto_api: t.gateway_status === "registrado",
      }));
      cacheVenc.set(venc, lista);
      return lista;
    };

    // O Sicredi limita a ~15 consultas/s por API (429): 2 trabalhadores com pausa entre chamadas e nova tentativa no 429.
    const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const fila = [...sequenciais];
    let ultimoOk = de - 1;
    await Promise.all(Array.from({ length: 2 }, async () => {
      for (let seq = fila.shift(); seq !== undefined && !limite; seq = fila.shift()) {
        const nn = montarNossoNumero(cfg.agencia, cfg.posto, cfg.codigo_beneficiario, ano, byte, seq);
        try {
          let d = null;
          for (let tentativa = 0; ; tentativa++) {
            try { d = await consultarPorNossoNumero(admin, cfg, nn); break; }
            catch (e) {
              if (e instanceof ErroSicredi && e.status === 429 && tentativa < 3) { await dormir(1500 * (tentativa + 1)); continue; }
              throw e;
            }
          }
          ultimoOk = Math.max(ultimoOk, seq);
          await dormir(150);
          if (!d) { naoExistem++; continue; }
          const comum = {
            nosso_numero: nn, situacao: d.situacao, vencimento: d.vencimento, valor_nominal: d.valorNominal,
            pagador: primeiroNome(d.nomePagador), documento: mascarar(d.documentoPagador), da_api: !!d.idTituloEmpresa,
          };
          if (d.idTituloEmpresa) { encontrados.push({ ...comum, resultado: "api" }); continue; }
          const r = casarLiquidacaoExterna(d, d.vencimento ? await candidatas(d.vencimento) : []);
          if (r.tipo === "unico") encontrados.push({ ...comum, resultado: "unico", aluno: primeiroNome(r.parcela.aluno), tem_boleto_api: r.parcela.tem_boleto_api });
          else if (r.tipo === "ambiguo") encontrados.push({ ...comum, resultado: "ambiguo", alunos: r.parcelas.map((p) => primeiroNome(p.aluno)) });
          else encontrados.push({ ...comum, resultado: "nenhum", motivo: r.motivo });
        } catch (e) {
          erros++;
          if (e instanceof ErroSicredi && e.status === 429) limite = true;
          errosDistintos.add((e instanceof Error ? e.message : String(e)).slice(0, 160));
        }
      }
    }));

    encontrados.sort((a, b) => String(a.nosso_numero).localeCompare(String(b.nosso_numero)));
    const conta = (t: string) => encontrados.filter((x) => x.resultado === t).length;
    return json({
      ok: true, escola_id: escolaId, ano, byte, de, ate, consultados: sequenciais.length - fila.length, ultimo_sequencial_ok: ultimoOk,
      encontrados: encontrados.length, nao_existem: naoExistem, erros, parou_por_limite: limite, erros_distintos: [...errosDistintos],
      unico: conta("unico"), ambiguo: conta("ambiguo"), nenhum: conta("nenhum"), api: conta("api"), resultados: encontrados,
    });
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message.slice(0, 300) : String(e) }, 500);
  }
});
