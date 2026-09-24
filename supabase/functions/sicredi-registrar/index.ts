import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json, clienteAdmin, usuarioTemPermissao, registrarParcela } from "../_shared/sicredi.ts";

// Registra no Sicredi o boleto (híbrido: boleto + Pix) de UMA parcela do financeiro.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { financeiro_id } = await req.json();
    if (!financeiro_id) return json({ ok: false, erro: "financeiro_id é obrigatório." }, 400);

    const admin = clienteAdmin();
    const { data: titulo } = await admin.from("financeiro").select("escola_id").eq("id", financeiro_id).maybeSingle();
    if (!titulo) return json({ ok: false, erro: "Título não encontrado." });

    if (!(await usuarioTemPermissao(req, titulo.escola_id, "financeiro", "editar"))) {
      return json({ ok: false, erro: "Você não tem permissão para registrar boletos desta escola." });
    }

    const r = await registrarParcela(admin, financeiro_id);
    return json(r);
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});
