import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, cors, json, normalizarDestino, hashCodigo, usuarioTemPermissao, type Canal } from "../_shared/familia.ts";

// Suporte da secretaria: gera na hora um código de login do app da família,
// pra ler pro responsável por telefone quando o e-mail não chega ou cai no
// spam. Diferente de familia-enviar-codigo: AUTENTICADO (verify_jwt=true,
// default da plataforma) + confere permissão na escola do aluno encontrado,
// sem limite de tentativas (é a secretaria pedindo, não abuso anônimo), e o
// código volta em texto puro na resposta — só pra quem já provou permissão.
const VALIDADE_MIN = 10;

function codigoAleatorio() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
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

  const { data: achados } = await db.rpc("familia_achar_alunos", {
    p_telefone: canal === "whatsapp" ? destino : null,
    p_email: canal === "email" ? destino : null,
  });
  if (!achados || achados.length === 0) {
    await db.from("familia_login_tentativas").insert({ canal, destino, resultado: "nao_cadastrado", detalhe: "gerado pela escola" });
    return json({ ok: false, erro: "nao_cadastrado" }, 404);
  }

  const escolaId = achados[0].escola_id as string;
  if (!(await usuarioTemPermissao(req, escolaId, "comunicacao", "editar"))) {
    await db.from("familia_login_tentativas").insert({ canal, destino, resultado: "erro_envio", detalhe: "staff sem permissão de comunicacao nesta escola" });
    return json({ ok: false, erro: "sem_permissao" }, 403);
  }

  const codigo = codigoAleatorio();
  const { error } = await db.from("familia_codigos_login").insert({
    canal,
    destino,
    codigo_hash: await hashCodigo(canal, destino, codigo),
    expira_em: new Date(Date.now() + VALIDADE_MIN * 60_000).toISOString(),
  });
  if (error) return json({ ok: false, erro: "erro_banco" }, 500);

  await db.from("familia_login_tentativas").insert({ canal, destino, resultado: "gerado_staff" });

  return json({ ok: true, codigo, validade_min: VALIDADE_MIN });
});
