import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Página pública de assinatura (verify_jwt = false: quem chama é o responsável pelo aluno, sem login).
// O acesso é pelo token aleatório de 64 caracteres guardado em assinaturas_documentos.
// GET  ?t=<token>  -> texto congelado do documento + situação da assinatura
// POST {t, nome, documento, imagem, forma, estilo, aceite} -> registra a assinatura (uma única vez)
// Regras: a família só assina depois que a escola (diretora) assinou dentro do sistema; o CPF digitado
// precisa bater com o do responsável cadastrado (5 erros bloqueiam o link); o link expira (expira_em);
// depois de assinado o conteúdo só abre por 30 min (cópia da família), a escola imprime pelo sistema.
// O CPF do responsável aparece mascarado no texto exibido pelo link (ele é a conferência da assinatura).
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
const FORMAS = new Set(["desenhada", "nome", "iniciais"]);
const ESTILOS = new Set(["dancing", "vibes", "caveat"]);
const MAX_TENTATIVAS = 5;
const JANELA_COPIA_MS = 30 * 60 * 1000;

const MSG_EXPIRADO = "Este link expirou. Peça um novo link à escola.";
const MSG_BLOQUEADO = "Este link foi bloqueado após várias tentativas com CPF incorreto. Peça à escola para renovar o link.";
const MSG_CANCELADO = "Este link foi cancelado pela escola.";
const MSG_SEM_ESCOLA = "Este documento ainda não foi liberado pela escola para assinatura. Peça à escola para concluir a etapa dela e enviar o link de novo.";

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

// O CPF do responsável é a "senha" da assinatura: não pode aparecer no texto que o link exibe.
// Troca qualquer CPF do texto que seja igual ao esperado (com ou sem pontuação); a escola vê o texto completo no sistema.
function mascararCpf(html: string, cpfEsperado: string | null): string {
  if (!cpfEsperado) return html;
  return html.replace(/(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, (m) =>
    m.replace(/\D/g, "") === cpfEsperado ? "***.***.***-**" : m
  );
}

const expirado = (l: Linha) => !!l.expira_em && new Date(l.expira_em).getTime() < Date.now();

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

    const l = s as Linha;
    if (!l.assinado_em) {
      if (l.cancelado_em) return json({ erro: MSG_CANCELADO }, 410);
      if (expirado(l)) return json({ erro: MSG_EXPIRADO }, 410);
      if ((l.tentativas_invalidas ?? 0) >= MAX_TENTATIVAS) return json({ erro: MSG_BLOQUEADO }, 429);
      if (!l.escola_assinou_em) return json({ erro: MSG_SEM_ESCOLA }, 403);
    } else if (Date.now() - new Date(l.assinado_em).getTime() > JANELA_COPIA_MS) {
      // já assinado há mais de 30 min: não expõe mais o texto nem os dados pessoais
      return json({
        limitado: true,
        assinado: true,
        escola: l.escolas?.nome ?? null,
        titulo: l.titulo,
        assinadoEm: l.assinado_em,
      });
    }

    return json({
      escolaAssinatura: l.escola_assinou_em
        ? {
            nome: l.escola_assinante_nome,
            cargo: l.escola_assinante_cargo,
            assinadoEm: l.escola_assinou_em,
            ip: l.escola_assinante_ip,
            imagem: l.escola_assinatura_imagem,
            forma: l.escola_assinatura_forma,
            estilo: l.escola_assinatura_estilo,
          }
        : null,
      escola: l.escolas?.nome ?? null,
      titulo: l.titulo,
      alunoNome: l.alunos?.nome ?? null,
      html: mascararCpf(await resolverLogo(db, l.corpo_html), l.cpf_esperado ?? null),
      assinado: !!l.assinado_em,
      assinadoEm: l.assinado_em,
      assinanteNome: l.assinante_nome,
      assinanteDocumento: l.assinante_documento,
      assinanteIp: l.assinante_ip,
      hashDocumento: l.hash_documento,
      assinaturaImagem: l.assinatura_imagem,
      assinaturaForma: l.assinatura_forma,
      assinaturaEstilo: l.assinatura_estilo,
      cpfConferido: l.cpf_conferido ?? null,
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
    const forma = String(c?.forma ?? "desenhada");
    const estilo = forma === "desenhada" ? null : String(c?.estilo ?? "");

    if (!TOKEN_OK.test(token)) return json({ erro: "Link inválido." }, 404);
    if (nome.length < 5 || nome.length > 150) return json({ erro: "Informe seu nome completo." }, 400);
    if (!cpfValido(documento)) return json({ erro: "CPF inválido. Confira os números." }, 400);
    if (c?.aceite !== true) return json({ erro: "É preciso aceitar os termos para assinar." }, 400);
    if (!PNG_OK.test(imagem) || imagem.length > LIMITE_IMAGEM) {
      return json({ erro: "Assinatura inválida. Desenhe de novo no quadro." }, 400);
    }
    if (!FORMAS.has(forma) || (estilo !== null && !ESTILOS.has(estilo))) {
      return json({ erro: "Forma de assinatura inválida." }, 400);
    }

    const { data: atual } = await db
      .from("assinaturas_documentos")
      .select("assinado_em, cancelado_em, escola_assinou_em, cpf_esperado, tentativas_invalidas, expira_em")
      .eq("token", token)
      .maybeSingle();
    if (!atual) return json({ erro: "Link inválido." }, 404);
    if (atual.assinado_em) return json({ erro: "Este documento já foi assinado." }, 409);
    if (atual.cancelado_em) return json({ erro: MSG_CANCELADO }, 410);
    if (expirado(atual)) return json({ erro: MSG_EXPIRADO }, 410);
    if ((atual.tentativas_invalidas ?? 0) >= MAX_TENTATIVAS) return json({ erro: MSG_BLOQUEADO }, 429);
    if (!atual.escola_assinou_em) return json({ erro: MSG_SEM_ESCOLA }, 403);

    // O CPF digitado precisa ser o do responsável cadastrado (congelado no pedido). Sem CPF no cadastro, não há o que conferir.
    if (atual.cpf_esperado && atual.cpf_esperado !== documento) {
      const usadas = (atual.tentativas_invalidas ?? 0) + 1;
      await db.from("assinaturas_documentos").update({ tentativas_invalidas: usadas }).eq("token", token).is("assinado_em", null);
      const restam = MAX_TENTATIVAS - usadas;
      return restam > 0
        ? json({ erro: `O CPF informado não confere com o do responsável cadastrado na escola. Restam ${restam} tentativa(s).` }, 400)
        : json({ erro: MSG_BLOQUEADO }, 429);
    }

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      null;
    const ua = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

    // Atualização condicional: só assina quem ainda não foi assinado, cancelado nem expirado (evita assinatura dupla)
    const agora = new Date().toISOString();
    const { data: gravado, error } = await db
      .from("assinaturas_documentos")
      .update({
        assinado_em: agora,
        assinante_nome: nome,
        assinante_documento: documento,
        assinante_ip: ip,
        assinante_user_agent: ua,
        assinatura_imagem: imagem,
        assinatura_forma: forma,
        assinatura_estilo: estilo,
        cpf_conferido: !!atual.cpf_esperado,
      })
      .eq("token", token)
      .is("assinado_em", null)
      .is("cancelado_em", null)
      .not("escola_assinou_em", "is", null)
      .or(`expira_em.is.null,expira_em.gt.${agora}`)
      .select("id")
      .maybeSingle();

    if (error) return json({ erro: "Não foi possível registrar a assinatura. Tente de novo." }, 500);
    if (gravado) return json({ ok: true });

    const { data: s } = await db
      .from("assinaturas_documentos")
      .select("assinado_em, cancelado_em, expira_em")
      .eq("token", token)
      .maybeSingle();
    if (!s) return json({ erro: "Link inválido." }, 404);
    if (s.assinado_em) return json({ erro: "Este documento já foi assinado." }, 409);
    if (s.cancelado_em) return json({ erro: MSG_CANCELADO }, 410);
    return json({ erro: MSG_EXPIRADO }, 410);
  }

  return json({ erro: "Método não permitido." }, 405);
});
