import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  corsHeaders, json, clienteAdmin, usuarioTemPermissao, carregarConfig, baixarPdfBoleto,
} from "../_shared/sicredi.ts";

// PDF oficial do boleto (o mesmo que o Sicredi imprime), de UMA parcela. verify_jwt = false; dois acessos:
//  - GET ?t=<token do boleto_links>: link público (página e e-mail do responsável), abre o PDF direto;
//  - POST { financeiro_id }: usuário logado com permissão de visualizar o financeiro; devolve { ok, base64, nome }.
// Só gera para parcela em aberto com boleto registrado.
const TOKEN_OK = /^[a-f0-9]{64}$/;

const pagina = (mensagem: string, status: number) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boleto</title>` +
      `<body style="font-family:Arial,sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;text-align:center;color:#1f2937"><p>${mensagem}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

const base64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
};

// deno-lint-ignore no-explicit-any
type Linha = Record<string, any>;

async function gerar(financeiroId: string): Promise<{ ok: true; bytes: Uint8Array; nome: string } | { ok: false; erro: string }> {
  const admin = clienteAdmin();
  const { data: t } = await admin.from("financeiro")
    .select("id, escola_id, status, gateway_status, boleto_linha_digitavel, data_vencimento").eq("id", financeiroId).maybeSingle();
  if (!t) return { ok: false, erro: "Cobrança não encontrada." };
  if (t.status !== "Pendente" && t.status !== "Atrasado") return { ok: false, erro: "Esta cobrança não está mais em aberto." };
  if (t.gateway_status !== "registrado" || !t.boleto_linha_digitavel) return { ok: false, erro: "O boleto desta cobrança ainda não foi registrado." };
  try {
    const cfg = await carregarConfig(admin, (t as Linha).escola_id);
    const bytes = await baixarPdfBoleto(admin, cfg, String(t.boleto_linha_digitavel));
    return { ok: true, bytes, nome: `boleto-${String(t.data_vencimento).slice(0, 10)}.pdf` };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível gerar o PDF." };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "GET") {
    const token = new URL(req.url).searchParams.get("t") ?? "";
    if (!TOKEN_OK.test(token)) return pagina("Link inválido.", 404);
    const admin = clienteAdmin();
    const { data: link } = await admin.from("boleto_links").select("financeiro_id").eq("token", token).maybeSingle();
    if (!link) return pagina("Link inválido ou expirado. Peça um novo à escola.", 404);

    const r = await gerar(link.financeiro_id as string);
    if (!r.ok) return pagina(`${r.erro} Fale com a escola.`, 422);
    return new Response(r.bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${r.nome}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  try {
    const { financeiro_id } = await req.json();
    if (!financeiro_id) return json({ ok: false, erro: "financeiro_id é obrigatório." }, 400);
    const { data: t } = await clienteAdmin().from("financeiro").select("escola_id").eq("id", financeiro_id).maybeSingle();
    if (!t) return json({ ok: false, erro: "Título não encontrado." });
    if (!(await usuarioTemPermissao(req, t.escola_id, "financeiro", "visualizar"))) {
      return json({ ok: false, erro: "Você não tem permissão para ver os boletos desta escola." }, 403);
    }
    const r = await gerar(financeiro_id);
    if (!r.ok) return json({ ok: false, erro: r.erro });
    return json({ ok: true, base64: base64(r.bytes), nome: r.nome });
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});
