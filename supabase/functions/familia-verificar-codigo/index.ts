import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, cors, hashCodigo, iguais, json, normalizarDestino, type Canal } from "../_shared/familia.ts";

// App dos pais: confere o código e devolve um token de uso único (token_hash) que o app troca por uma
// sessão com supabase.auth.verifyOtp({ token_hash, type: "magiclink" }). verify_jwt = false.
// Cria o usuário do Auth na primeira entrada (e-mail sintético, o contato real fica em familia_pessoas)
// e sincroniza os vínculos com o cadastro das escolas.
const MAX_TENTATIVAS = 5;
const INVALIDO = () => json({ ok: false, erro: "codigo_invalido" }, 400);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, erro: "método" }, 405);

  const corpo = await req.json().catch(() => ({}));
  const canal = corpo?.canal as Canal;
  const codigo = String(corpo?.codigo ?? "").replace(/\s/g, "");
  if ((canal !== "whatsapp" && canal !== "email") || !/^\d{6}$/.test(codigo)) return INVALIDO();

  const db = admin();
  const destino = await normalizarDestino(db, canal, corpo?.destino);
  if (!destino) return INVALIDO();

  try {
    // último código ainda válido deste destino
    const { data: linha } = await db.from("familia_codigos_login").select("*")
      .eq("canal", canal).eq("destino", destino).is("usado_em", null)
      .gt("expira_em", new Date().toISOString()).lt("tentativas", MAX_TENTATIVAS)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!linha) return INVALIDO();

    // conta a tentativa ANTES de comparar (travando o mesmo valor evita corrida entre chamadas)
    const { data: contou } = await db.from("familia_codigos_login")
      .update({ tentativas: linha.tentativas + 1 }).eq("id", linha.id).eq("tentativas", linha.tentativas).select("id");
    if (!contou || contou.length === 0) return INVALIDO();

    if (!iguais(await hashCodigo(canal, destino, codigo), linha.codigo_hash)) return INVALIDO();

    // marca como usado só se ninguém usou antes (código vale uma vez)
    const { data: usou } = await db.from("familia_codigos_login")
      .update({ usado_em: new Date().toISOString() }).eq("id", linha.id).is("usado_em", null).select("id");
    if (!usou || usou.length === 0) return INVALIDO();

    // pessoa: acha pelo contato; se não existe, cria o usuário do Auth e a pessoa
    const coluna = canal === "whatsapp" ? "telefone" : "email";
    let { data: pessoa } = await db.from("familia_pessoas").select("id, auth_user_id").eq(coluna, destino).maybeSingle();
    if (!pessoa) {
      const emailSintetico = `familia-${crypto.randomUUID()}@familia.veloci.invalid`;
      const { data: criado, error: erroAuth } = await db.auth.admin.createUser({
        email: emailSintetico, email_confirm: true, user_metadata: { familia: true },
      });
      if (erroAuth || !criado.user) throw erroAuth ?? new Error("não criou o usuário");
      const { data: nova, error: erroPessoa } = await db.from("familia_pessoas")
        .insert({ auth_user_id: criado.user.id, [coluna]: destino }).select("id, auth_user_id").single();
      if (erroPessoa) {
        await db.auth.admin.deleteUser(criado.user.id); // não deixa usuário órfão
        throw erroPessoa;
      }
      pessoa = nova;
    }

    const { data: ativos, error: erroSync } = await db.rpc("familia_sincronizar_vinculos", { p_pessoa: pessoa.id });
    if (erroSync) throw erroSync;
    if (!ativos || ativos === 0) return json({ ok: false, erro: "sem_vinculo" }, 403);

    const { data: usuario } = await db.auth.admin.getUserById(pessoa.auth_user_id);
    const emailAuth = usuario.user?.email;
    if (!emailAuth) throw new Error("usuário sem e-mail interno");
    const { data: link, error: erroLink } = await db.auth.admin.generateLink({ type: "magiclink", email: emailAuth });
    if (erroLink || !link.properties?.hashed_token) throw erroLink ?? new Error("não gerou o link");

    await db.from("familia_pessoas").update({ ultimo_acesso: new Date().toISOString() }).eq("id", pessoa.id);
    return json({ ok: true, token_hash: link.properties.hashed_token });
  } catch (e) {
    console.error("familia-verificar-codigo:", e instanceof Error ? e.message : e);
    return json({ ok: false, erro: "falha" }, 500);
  }
});
