import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, cors, hashCodigo, json, normalizarDestino, type Canal } from "../_shared/familia.ts";

// App dos pais: envia o código de entrada por WhatsApp ou e-mail. verify_jwt = false (quem chama ainda
// não está logado). Só envia se o telefone/e-mail estiver no cadastro de algum aluno ativo, mas a
// resposta é SEMPRE a mesma, para ninguém descobrir quem é cliente da escola.
const N8N_EMAIL_URL = Deno.env.get("EMAIL_N8N_EDU_URL") ?? "https://n8n.velociprime.com.br/webhook/email-envio-edu";
const WHATSAPP_URL = Deno.env.get("FAMILIA_WHATSAPP_URL"); // webhook do n8n/WAHA; ainda não existe
const VALIDADE_MIN = 10;
const MAX_POR_DESTINO = 3; // por janela de 10 minutos
const MAX_GLOBAL = 200; // por janela de 10 minutos, trava abuso em massa

function codigoAleatorio() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}

async function enviarEmail(db: ReturnType<typeof admin>, para: string, codigo: string) {
  const { data: segredo } = await db.rpc("email_n8n_segredo");
  if (!segredo) throw new Error("segredo do e-mail não configurado");
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#1f2937">
<p>Seu código para entrar no app Veloci Educacional:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px">${codigo}</p>
<p>Vale por ${VALIDADE_MIN} minutos. Se não foi você, ignore este e-mail.</p></body></html>`;
  const resp = await fetch(N8N_EMAIL_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-email-secret": String(segredo) },
    body: JSON.stringify({ nomeRemetente: "Veloci Educacional", responderPara: null, para, assunto: `Seu código: ${codigo}`, html }),
    signal: AbortSignal.timeout(20_000),
  });
  const corpo = await resp.json().catch(() => null);
  if (!resp.ok || corpo?.ok !== true) throw new Error(corpo?.erro ?? `n8n respondeu ${resp.status}`);
}

async function enviarWhatsapp(telefone: string, codigo: string) {
  if (!WHATSAPP_URL) throw new Error("FAMILIA_WHATSAPP_URL não configurado (remetente de WhatsApp ainda não definido)");
  const resp = await fetch(WHATSAPP_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-whatsapp-secret": Deno.env.get("FAMILIA_WHATSAPP_SECRET") ?? "" },
    body: JSON.stringify({ telefone, mensagem: `Veloci Educacional: seu código de entrada é ${codigo}. Vale por ${VALIDADE_MIN} minutos. Não compartilhe.` }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) throw new Error(`WhatsApp respondeu ${resp.status}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, erro: "método" }, 405);

  const corpo = await req.json().catch(() => ({}));
  const canal = corpo?.canal as Canal;
  if (canal !== "whatsapp" && canal !== "email") return json({ ok: false, erro: "canal" }, 400);

  const db = admin();
  const destino = await normalizarDestino(db, canal, corpo?.destino);
  if (!destino) return json({ ok: false, erro: "formato" }, 400);

  const resposta = json({ ok: true }); // igual para cadastrado e não cadastrado
  try {
    const { data: achados } = await db.rpc("familia_achar_alunos", {
      p_telefone: canal === "whatsapp" ? destino : null,
      p_email: canal === "email" ? destino : null,
    });
    if (!achados || achados.length === 0) return resposta;

    const desde = new Date(Date.now() - VALIDADE_MIN * 60_000).toISOString();
    const { count: doDestino } = await db.from("familia_codigos_login").select("id", { count: "exact", head: true })
      .eq("canal", canal).eq("destino", destino).gte("created_at", desde);
    if ((doDestino ?? 0) >= MAX_POR_DESTINO) return resposta;
    const { count: global } = await db.from("familia_codigos_login").select("id", { count: "exact", head: true }).gte("created_at", desde);
    if ((global ?? 0) >= MAX_GLOBAL) return resposta;

    const codigo = codigoAleatorio();
    const { error } = await db.from("familia_codigos_login").insert({
      canal, destino, codigo_hash: await hashCodigo(canal, destino, codigo),
      expira_em: new Date(Date.now() + VALIDADE_MIN * 60_000).toISOString(),
    });
    if (error) throw error;

    if (canal === "email") await enviarEmail(db, destino, codigo);
    else await enviarWhatsapp(destino, codigo);
  } catch (e) {
    console.error("familia-enviar-codigo:", e instanceof Error ? e.message : e);
  }
  return resposta;
});
