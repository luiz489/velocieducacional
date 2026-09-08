import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, papel_nome } = body;
    // Aceita escola_ids (novo) ou escola_id + papel_id (formato antigo).
    let escola_ids: string[] = Array.isArray(body.escola_ids)
      ? body.escola_ids
      : body.escola_id
      ? [body.escola_id]
      : [];
    escola_ids = [...new Set(escola_ids.filter((x: unknown) => typeof x === "string" && x))];

    if (!email || !password || escola_ids.length === 0 || (!papel_nome && !body.papel_id)) {
      return new Response(JSON.stringify({ error: "Preencha e-mail, senha, unidade(s) e papel." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "A senha precisa ter pelo menos 6 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente com o token de quem está chamando, só para checar permissão
    const supabaseCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    for (const escola_id of escola_ids) {
      const { data: temPermissao, error: permErro } = await supabaseCaller.rpc("usuario_tem_permissao", {
        p_escola_id: escola_id,
        p_modulo_codigo: "configuracoes",
        p_acao: "editar",
      });
      if (permErro || !temPermissao) {
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para criar usuários em uma das unidades selecionadas." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Cliente com service role, só agora, pra criar o usuário de verdade
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve o papel_id por escola (papeis são por escola). Se veio papel_id
    // antigo, usa ele só quando há uma única unidade.
    const papelPorEscola = new Map<string, string>();
    if (papel_nome) {
      const { data: papeisData, error: papeisErro } = await supabaseAdmin
        .from("papeis")
        .select("id, escola_id")
        .in("escola_id", escola_ids)
        .eq("nome", papel_nome);
      if (papeisErro) {
        return new Response(JSON.stringify({ error: "Erro ao resolver o papel: " + papeisErro.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const p of papeisData ?? []) papelPorEscola.set(p.escola_id, p.id);
      const semPapel = escola_ids.filter((e) => !papelPorEscola.has(e));
      if (semPapel.length > 0) {
        return new Response(
          JSON.stringify({ error: `O papel "${papel_nome}" não existe em ${semPapel.length} das unidades selecionadas.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      papelPorEscola.set(escola_ids[0], body.papel_id);
    }

    const { data: novoUsuario, error: criarErro } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email },
    });

    if (criarErro) {
      return new Response(JSON.stringify({ error: criarErro.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const linhas = escola_ids.map((escola_id) => ({
      user_id: novoUsuario.user.id,
      escola_id,
      papel_id: papelPorEscola.get(escola_id),
    }));

    const { error: vinculoErro } = await supabaseAdmin.from("usuarios_escolas").insert(linhas);

    if (vinculoErro) {
      return new Response(
        JSON.stringify({ error: "Usuário criado, mas houve erro ao vincular às unidades: " + vinculoErro.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, user_id: novoUsuario.user.id, unidades: escola_ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
