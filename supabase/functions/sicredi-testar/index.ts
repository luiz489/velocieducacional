import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, obterAccessToken,
} from "../_shared/sicredi.ts";

// Testa se as credenciais salvas da escola autenticam no Sicredi (botão "Testar conexão").
// Erros esperados voltam com HTTP 200 + { ok: false, erro } pra a tela poder mostrar a mensagem.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { escola_id } = await req.json();
    if (!escola_id) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);

    if (!(await usuarioTemPermissao(req, escola_id, "integracao_bancaria", "visualizar"))) {
      return json({ ok: false, erro: "Você não tem permissão para testar a integração bancária desta escola." });
    }

    const admin = clienteAdmin();
    const cfg = await carregarConfig(admin, escola_id);
    await obterAccessToken(admin, cfg, true); // força autenticar de verdade, sem usar o cache
    return json({ ok: true, ambiente: cfg.ambiente });
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});
