import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with user's token to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if caller is admin
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = callerRoles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "list") {
      // List all users with their profiles and roles
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) throw listError;

      const { data: allRoles } = await adminClient.from("user_roles").select("*");
      const { data: allProfiles } = await adminClient.from("profiles").select("*");

      const result = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: allProfiles?.find((p: any) => p.id === u.id)?.full_name || u.email,
        created_at: u.created_at,
        roles: allRoles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || [],
      }));

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "assign-role") {
      const { user_id, role } = await req.json();

      if (!user_id || !role || !["admin", "staff"].includes(role)) {
        return new Response(JSON.stringify({ error: "Dados inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: insertError } = await adminClient
        .from("user_roles")
        .insert({ user_id, role })
        .select();

      if (insertError && insertError.code === "23505") {
        return new Response(JSON.stringify({ message: "Papel já atribuído" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (insertError) throw insertError;

      return new Response(JSON.stringify({ message: "Papel atribuído com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "remove-role") {
      const { user_id, role } = await req.json();

      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "Dados inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent removing own admin role
      if (user_id === user.id && role === "admin") {
        return new Response(JSON.stringify({ error: "Você não pode remover seu próprio papel de admin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ message: "Papel removido com sucesso" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação não encontrada" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
