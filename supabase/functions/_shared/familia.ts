import { createClient } from "jsr:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

export type Canal = "whatsapp" | "email";
export const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Telefone normalizado pelo mesmo SQL que a sincronização usa (uma só regra); e-mail em minúsculo.
// Devolve null quando o formato não presta.
export async function normalizarDestino(db: ReturnType<typeof admin>, canal: Canal, bruto: unknown) {
  const texto = String(bruto ?? "").trim();
  if (canal === "email") {
    const email = texto.toLowerCase();
    return email.length <= 200 && EMAIL_OK.test(email) ? email : null;
  }
  const { data } = await db.rpc("familia_normalizar_telefone", { p: texto });
  return (data as string | null) ?? null;
}

// hash do código com um segredo do servidor: o banco sozinho não permite refazer os códigos
export async function hashCodigo(canal: string, destino: string, codigo: string) {
  const pepper = Deno.env.get("FAMILIA_PEPPER");
  if (!pepper) throw new Error("FAMILIA_PEPPER não configurado");
  const dados = new TextEncoder().encode(`${pepper}:${canal}:${destino}:${codigo}`);
  const h = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Confere no banco, com a identidade de QUEM CHAMA (não service_role), se ele tem a permissão na escola. */
export async function usuarioTemPermissao(req: Request, escolaId: string, modulo: string, acao: string): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await caller.rpc("usuario_tem_permissao", {
    p_escola_id: escolaId, p_modulo_codigo: modulo, p_acao: acao,
  });
  return !error && data === true;
}

export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
