import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Página pública de assinatura (verify_jwt = false: quem chama é o responsável pelo aluno, sem login).
// O acesso é pelo token aleatório de 64 caracteres guardado em assinaturas_documentos.
// GET  ?t=<token>  -> texto congelado do documento + situação da assinatura
// POST {t, nome, documento, imagem, aceite} -> registra a assinatura (uma única vez)
// A família só consegue abrir/assinar depois que a escola (diretora) assinou dentro do sistema.
// Só esta função grava a assinatura (service role); quem está logado na escola não consegue.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const TOKEN_OK = /^[a-f0-9]{64}$/;
const PNG_OK = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;
const LIMITE_IMAGEM = 400_000;

function cpfValido(bruto: string): boolean {
  const c = bruto.replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

// deno-lint-ignore no-explicit-any
type Linha = Record<string, any>;

async function resolverLogo(db: ReturnType<typeof admin>, html: string): Promise<string> {
  const m = html.match(/data-logo-path="([^"]*)"/);
  if (!m) return html;
  const caminho = m[1];
  if (caminho) {
    const { data } = await db.storage.from("escola-logos").createSignedUrl(caminho, 3600);
    if (data?.signedUrl) return html.replace(`data-logo-path="${caminho}"`, `src="${data.signedUrl}"`);
  }
  return html.replace(/<img data-logo-path="[^"]*"[^>]*\/>/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const db = admin();

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    if (!TOKEN_OK.test(token)) return json({ erro: "Link inválido." }, 404);

    const { data: s } = await db
      .from("assinaturas_documentos")
      .select("*, escolas(nome), alunos(nome)")
      .eq("token", token)
      .maybeSingle();
    if (!s) return json({ erro: "Link inválido." }, 404);
    if (s.cancelado_em && !s.assinado_em) {
      return json({ erro: "Este link foi cancelado pela escola." }, 410);
    }

    const l = s as Linha;
    if (!l.escola_assinou_em && !l.assinado_em) {
      return json({
        erro: "Este documento ainda não foi liberado pela escola para assinatura. Peça à escola para concluir a etapa dela e enviar o link de novo.",
      }, 403);
    }
    return json({
      escolaAssinatura: l.escola_assinou_em
        ? {
            nome: l.escola_assinante_nome,
            cargo: l.escola_assinante_cargo,
            assinadoEm: l.escola_assinou_em,
            ip: l.escola_assinante_ip,
            imagem: l.escola_assinatura_imagem,
          }
        : null,
      escola: l.escolas?.nome ?? null,
      titulo: l.titulo,
      alunoNome: l.alunos?.nome ?? null,
      html: await resolverLogo(db, l.corpo_html),
      assinado: !!l.assinado_em,
      assinadoEm: l.assinado_em,
      assinanteNome: l.assinante_nome,
      assinanteDocumento: l.assinante_documento,
      assinanteIp: l.assinante_ip,
      hashDocumento: l.hash_documento,
      assinaturaImagem: l.assinatura_imagem,
    });
  }

  if (req.method === "POST") {
    // deno-lint-ignore no-explicit-any
    let c: any;
    try { c = await req.json(); } catch { return json({ erro: "Requisição inválida." }, 400); }

    const token = String(c?.t ?? "");
    const nome = String(c?.nome ?? "").trim().replace(/\s+/g, " ");
    const documento = String(c?.documento ?? "").replace(/\D/g, "");
    const imagem = String(c?.imagem ?? "");

    if (!TOKEN_OK.test(token)) return json({ erro: "Link inválido." }, 404);
    if (nome.length < 5 || nome.length > 150) return json({ erro: "Informe seu nome completo." }, 400);
    if (!cpfValido(documento)) return json({ erro: "CPF inválido. Confira os números." }, 400);
    if (c?.aceite !== true) return json({ erro: "É preciso aceitar os termos para assinar." }, 400);
    if (!PNG_OK.test(imagem) || imagem.length > LIMITE_IMAGEM) {
      return json({ erro: "Assinatura inválida. Desenhe de novo no quadro." }, 400);
    }

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

    // Atualização condicional: só assina quem ainda não foi assinado nem cancelado (evita assinatura dupla)
    const { data: gravado, error } = await db
      .from("assinaturas_documentos")
      .update({
        assinado_em: new Date().toISOString(),
        assinante_nome: nome,
        assinante_documento: documento,
        assinante_ip: ip,
        assinante_user_agent: ua,
        assinatura_imagem: imagem,
      })
      .eq("token", token)
      .is("assinado_em", null)
      .is("cancelado_em", null)
      .not("escola_assinou_em", "is", null)
      .select("id")
      .maybeSingle();

    if (error) return json({ erro: "Não foi possível registrar a assinatura. Tente de novo." }, 500);
    if (gravado) return json({ ok: true });

    const { data: s } = await db
      .from("assinaturas_documentos")
      .select("assinado_em, cancelado_em, escola_assinou_em")
      .eq("token", token)
      .maybeSingle();
    if (!s) return json({ erro: "Link inválido." }, 404);
    if (s.assinado_em) return json({ erro: "Este documento já foi assinado." }, 409);
    if (!s.cancelado_em && !s.escola_assinou_em) {
      return json({ erro: "Este documento ainda não foi liberado pela escola para assinatura." }, 403);
    }
    return json({ erro: "Este link foi cancelado pela escola." }, 410);
  }

  return json({ erro: "Método não permitido." }, 405);
});
