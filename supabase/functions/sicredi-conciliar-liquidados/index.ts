import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, listarLiquidadosDoDia,
  type ConfigIntegracao,
} from "../_shared/sicredi.ts";

// Rede de segurança do webhook: pergunta ao Sicredi o que foi liquidado nos últimos dias e dá baixa
// no que o webhook não entregou. É idempotente (título já Pago não é tocado).
// verify_jwt = false (cron sem JWT); a função valida sozinha, como a sicredi-processar-fila:
//  - cron: x-cron-secret conferido no banco (Vault). Roda em todas as escolas em PRODUÇÃO
//    (ou só na escola informada em { escola_id }, qualquer ambiente);
//  - tela: usuário logado com permissão na escola informada.
const DIAS_PARA_TRAS = 3; // hoje + 2 anteriores: cobre o Pix de fim de semana lançado no dia útil seguinte

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
  try { escolaId = (await req.json())?.escola_id ?? null; } catch { /* sem corpo */ }

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
    const item = { escola_id, consultados: 0, baixados: 0, ja_baixados_ou_desconhecidos: 0, erro: null as string | null };
    try {
      const cfg: ConfigIntegracao = await carregarConfig(admin, escola_id);
      const chave = `${cfg.agencia.replace(/\D/g, "")}-${cfg.posto.replace(/\D/g, "")}-${cfg.codigo_beneficiario.replace(/\D/g, "")}`;

      for (let i = 0; i < DIAS_PARA_TRAS; i++) {
        const dia = ddmmyyyy(new Date(Date.now() - i * 86_400_000));
        for (const b of await listarLiquidadosDoDia(admin, cfg, dia)) {
          item.consultados++;
          const idEvento = `poll:${b.nossoNumero}:${b.dataPagamento}`;

          // já processado antes (por webhook ou por uma consulta anterior)? então só segue
          const { data: visto } = await admin.from("cobranca_eventos").select("id")
            .eq("chave_beneficiario", chave).eq("id_evento", idEvento).maybeSingle();
          if (visto) continue;

          // título desconhecido nesta escola (boleto de outro sistema) ou já Pago (o webhook entregou): nada a fazer
          const { data: t } = await admin.from("financeiro").select("id, status")
            .eq("escola_id", escola_id).eq("gateway_cobranca_id", b.nossoNumero).maybeSingle();
          if (!t) { item.ja_baixados_ou_desconhecidos++; continue; }
          if (t.status === "Pago") continue;

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

          if (tituloId) item.baixados++;
          await admin.from("cobranca_eventos").insert({
            escola_id, chave_beneficiario: chave, id_evento: idEvento, movimento: `CONSULTA_${b.tipoLiquidacao || "LIQUIDADO"}`,
            nosso_numero: b.nossoNumero, payload: b, status: tituloId ? "processado" : "ignorado",
            detalhe: tituloId ? "Baixa pela consulta diária (o webhook não entregou)." : "Sem título correspondente nesta escola.",
          });
        }
      }
    } catch (e) {
      item.erro = e instanceof Error ? e.message.slice(0, 300) : String(e);
    }
    resumo.push(item);
  }

  return json({ ok: true, escolas: resumo });
});
