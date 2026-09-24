import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, clienteAdmin } from "../_shared/sicredi.ts";
import {
  parseWebhook, chaveBeneficiario, ehLiquidacao, ehEstorno, formaPagamentoDoMovimento,
} from "../_shared/sicredi-core.ts";

// Recebe os eventos de cobrança do Sicredi (verify_jwt = false: quem chama é o banco).
// Autenticação: segredo por escola, aceito no cabeçalho (contrato "header"/"token") ou em ?k= na URL.
const iguais = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, erro: "Método não permitido" }, 405);

  // deno-lint-ignore no-explicit-any
  let corpo: any;
  try { corpo = await req.json(); } catch { return json({ ok: false, erro: "JSON inválido" }, 400); }

  let evento;
  try { evento = parseWebhook(corpo); } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : "Payload inválido" }, 400);
  }

  const admin = clienteAdmin();
  const chave = chaveBeneficiario(evento.agencia, evento.posto, evento.beneficiario);

  const { data: cfgs } = await admin.from("escolas_integracao_bancaria")
    .select("escola_id, agencia, posto, codigo_beneficiario, conta_bancaria_id, webhook_segredo, ativo");
  const candidatas = (cfgs ?? []).filter((c) =>
    c.ativo && c.webhook_segredo &&
    chaveBeneficiario(c.agencia, c.posto, c.codigo_beneficiario) === chave
  );

  const apresentados: string[] = [new URL(req.url).searchParams.get("k") ?? ""];
  req.headers.forEach((v, n) => { if (!["authorization", "cookie"].includes(n)) apresentados.push(v); });

  const cfg = candidatas.find((c) => apresentados.some((v) => v && iguais(v, c.webhook_segredo as string)));
  if (!cfg) return json({ ok: false, erro: "Não autorizado" }, 401);

  // registra o que chegou (cabeçalhos sem o segredo) - também serve pra descobrir como o Sicredi envia o token
  const headersLog: Record<string, string> = {};
  req.headers.forEach((v, n) => {
    if (["authorization", "cookie"].includes(n)) return;
    headersLog[n] = iguais(v, cfg.webhook_segredo as string) ? "[segredo]" : v.slice(0, 200);
  });

  const { data: existente } = await admin.from("cobranca_eventos").select("id, status")
    .eq("chave_beneficiario", chave).eq("id_evento", evento.idEventoWebhook).maybeSingle();
  if (existente && ["processado", "ignorado", "estorno_pendente"].includes(existente.status)) {
    return json({ ok: true, duplicado: true });
  }

  let eventoId = existente?.id as string | undefined;
  if (!eventoId) {
    const { data: novo, error: errIns } = await admin.from("cobranca_eventos").insert({
      escola_id: cfg.escola_id, chave_beneficiario: chave, id_evento: evento.idEventoWebhook,
      movimento: evento.movimento, nosso_numero: evento.nossoNumero, payload: corpo, headers: headersLog,
    }).select("id").single();
    if (errIns) {
      if (errIns.code === "23505") return json({ ok: true, duplicado: true }); // corrida com outra entrega
      return json({ ok: false, erro: "Falha ao registrar o evento" }, 500);
    }
    eventoId = novo.id;
  }

  const fechar = (status: string, detalhe: string | null) =>
    admin.from("cobranca_eventos").update({ status, detalhe }).eq("id", eventoId!);

  if (ehLiquidacao(evento.movimento)) {
    const { data: tituloId, error } = await admin.rpc("baixar_titulo_por_cobranca_bancaria", {
      p_escola_id: cfg.escola_id,
      p_gateway_cobranca_id: evento.nossoNumero,
      p_valor_pago: evento.valorLiquidacao,
      p_data_pagamento: evento.dataEvento,
      p_conta_bancaria_id: cfg.conta_bancaria_id,
      p_forma_pagamento: formaPagamentoDoMovimento(evento.movimento),
      p_ref_evento: `sicredi:${evento.idEventoWebhook}`,
    });
    if (error) {
      await fechar("erro", error.message.slice(0, 300));
      return json({ ok: false, erro: "Falha ao dar baixa" }, 500); // o Sicredi reenvia
    }
    if (!tituloId) {
      await fechar("ignorado", `Nenhum título com nosso número ${evento.nossoNumero} nesta escola.`);
      return json({ ok: true, titulo: null });
    }
    await fechar("processado", null);
    return json({ ok: true, titulo: tituloId });
  }

  if (ehEstorno(evento.movimento)) {
    await fechar("estorno_pendente", "Estorno de liquidação: revisar o título manualmente.");
    return json({ ok: true });
  }

  await fechar("ignorado", `Movimento ${evento.movimento} não tratado.`);
  return json({ ok: true });
});
