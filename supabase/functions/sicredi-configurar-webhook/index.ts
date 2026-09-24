import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, contratarWebhook,
} from "../_shared/sicredi.ts";

const HEADER_SEGREDO = "x-veloci-webhook";

// Cria/atualiza no Sicredi o contrato de webhook que aponta pra função sicredi-webhook desta escola.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { escola_id } = await req.json();
    if (!escola_id) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);

    if (!(await usuarioTemPermissao(req, escola_id, "integracao_bancaria", "editar"))) {
      return json({ ok: false, erro: "Você não tem permissão para configurar a integração bancária desta escola." });
    }

    const admin = clienteAdmin();
    const cfg = await carregarConfig(admin, escola_id);

    const segredo = cfg.webhook_segredo || (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sicredi-webhook?k=${segredo}`;

    // grava o segredo ANTES de contratar: se o Sicredi chamar logo em seguida, já dá pra validar
    await admin.from("escolas_integracao_bancaria")
      .update({ webhook_segredo: segredo, webhook_status: "configurando" }).eq("escola_id", escola_id);

    try {
      const idContrato = await contratarWebhook(admin, cfg, { url, header: HEADER_SEGREDO, token: segredo });
      await admin.from("escolas_integracao_bancaria")
        .update({ webhook_contrato_id: idContrato, webhook_status: cfg.ambiente === "producao" ? "ativo" : "homologacao" }).eq("escola_id", escola_id);
      return json({ ok: true, idContrato, ambiente: cfg.ambiente });
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e);
      await admin.from("escolas_integracao_bancaria")
        .update({ webhook_status: "erro: " + erro.slice(0, 200) }).eq("escola_id", escola_id);
      return json({ ok: false, erro });
    }
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});
