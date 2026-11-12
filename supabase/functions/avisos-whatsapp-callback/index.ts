import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// O n8n chama este function pra avisar o resultado de cada destinatário (enviado/erro), item por item,
// à medida que vai mandando as mensagens no WhatsApp. verify_jwt = false: quem chama não tem usuário
// logado, por isso a autenticação é por segredo compartilhado (o mesmo da automação de e-mail).
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-automacao-secret" };
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// deno-lint-ignore no-explicit-any
type Linha = Record<string, any>;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const { data: segredoEsperado } = await db.rpc("email_n8n_segredo");
  if (!segredoEsperado || req.headers.get("x-automacao-secret") !== segredoEsperado) {
    return json({ ok: false, erro: "Não autorizado." }, 401);
  }

  let corpo: Linha = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  const itens = Array.isArray(corpo.itens) ? corpo.itens : [corpo];
  const avisosTocados = new Set<string>();

  for (const i of itens) {
    const itemId = i.item_id as string | undefined;
    const status = i.status === "enviado" ? "enviado" : i.status === "erro" ? "erro" : null;
    if (!itemId || !status) continue;

    const { data: itemAtualizado } = await db.from("avisos_whatsapp_itens")
      .update({ status, erro: status === "erro" ? String(i.erro ?? "Falha no envio.").slice(0, 300) : null, enviado_em: status === "enviado" ? new Date().toISOString() : null })
      .eq("id", itemId).select("aviso_id").maybeSingle();
    if (itemAtualizado?.aviso_id) avisosTocados.add(itemAtualizado.aviso_id as string);
  }

  for (const avisoId of avisosTocados) {
    const { count: pendentes } = await db.from("avisos_whatsapp_itens").select("id", { count: "exact", head: true })
      .eq("aviso_id", avisoId).eq("status", "pendente");
    const { count: enviados } = await db.from("avisos_whatsapp_itens").select("id", { count: "exact", head: true })
      .eq("aviso_id", avisoId).eq("status", "enviado");
    const { count: erros } = await db.from("avisos_whatsapp_itens").select("id", { count: "exact", head: true })
      .eq("aviso_id", avisoId).eq("status", "erro");

    const patch: Linha = { total_enviados: enviados ?? 0, total_erros: erros ?? 0 };
    if ((pendentes ?? 0) === 0) { patch.status = "concluido"; patch.concluido_em = new Date().toISOString(); }
    await db.from("avisos_whatsapp").update(patch).eq("id", avisoId);
  }

  return json({ ok: true });
});
