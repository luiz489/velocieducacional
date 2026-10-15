import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

// Página pública do boleto (verify_jwt = false: quem chama é o responsável, sem login).
// GET ?t=<token de 64 hex>&qr=1 -> imagem PNG do QR Pix (usada no e-mail, que bloqueia imagens embutidas).
// GET ?t=<token de 64 hex> -> dados mínimos para pagar: valor, vencimento, QR Pix e linha digitável.
// Não expõe CPF, endereço nem dados do responsável; só o primeiro nome do aluno.
// Depois de pago, ou fora da validade do Pix, o código de pagamento deixa de ser devolvido.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const TOKEN_OK = /^[a-f0-9]{64}$/;
const VALIDADE_PIX_DIAS = 30;

const hojeBrasilia = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date()); // YYYY-MM-DD

const somaDias = (iso: string, dias: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return json({ erro: "Método não permitido." }, 405);

  const params = new URL(req.url).searchParams;
  const token = params.get("t") ?? "";
  const soQr = params.get("qr") === "1";
  if (!TOKEN_OK.test(token)) return json({ erro: "Link inválido." }, 404);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: link } = await db.from("boleto_links")
    .select("id, acessos, financeiro_id, escolas(nome)").eq("token", token).maybeSingle();
  if (!link) return json({ erro: "Link inválido ou expirado. Peça um novo à escola." }, 404);

  const { data: t } = await db.from("financeiro").select(`
      descricao, valor, valor_integral, data_vencimento, status, data_pagamento,
      gateway_status, pix_qr_code, boleto_linha_digitavel,
      matriculas ( alunos ( nome ), turmas ( nome ) )
    `).eq("id", link.financeiro_id).maybeSingle();
  if (!t) return json({ erro: "Cobrança não encontrada. Fale com a escola." }, 404);

  if (!soQr) await db.from("boleto_links")
    .update({ acessos: (link.acessos ?? 0) + 1, ultimo_acesso_em: new Date().toISOString() }).eq("id", link.id);

  // deno-lint-ignore no-explicit-any
  const m: any = (t as any).matriculas;
  const nomeAluno = String(m?.alunos?.nome ?? "").trim().split(/\s+/)[0] ?? "";
  const hoje = hojeBrasilia();
  const limitePix = somaDias(t.data_vencimento, VALIDADE_PIX_DIAS);

  const base = {
    escola: (link as { escolas?: { nome?: string } }).escolas?.nome ?? null,
    aluno: nomeAluno,
    turma: m?.turmas?.nome ?? null,
    descricao: t.descricao,
    vencimento: t.data_vencimento,
    valor_ate_vencimento: Number(t.valor),
    valor_integral: Number(t.valor_integral ?? t.valor),
    pix_valido_ate: limitePix,
  };

  if (t.status === "Pago") {
    return json({ ...base, situacao: "pago", data_pagamento: t.data_pagamento });
  }
  if (t.status !== "Pendente" && t.status !== "Atrasado") {
    return json({ ...base, situacao: "indisponivel", mensagem: "Esta cobrança não está mais em aberto. Fale com a escola." });
  }
  if (t.gateway_status !== "registrado" || !t.boleto_linha_digitavel) {
    return json({ ...base, situacao: "indisponivel", mensagem: "O boleto desta cobrança ainda não está disponível. Fale com a escola." });
  }
  if (hoje > limitePix) {
    return json({ ...base, situacao: "expirado", mensagem: "Este boleto venceu há mais de " + VALIDADE_PIX_DIAS + " dias. Peça a segunda via à escola." });
  }

  if (soQr) {
    if (!t.pix_qr_code) return json({ erro: "Sem Pix neste boleto." }, 404);
    const png = await QRCode.toBuffer(t.pix_qr_code, { margin: 1, width: 300 });
    return new Response(png, {
      headers: { ...cors, "Content-Type": "image/png", "Cache-Control": "private, max-age=300" },
    });
  }

  return json({
    ...base,
    situacao: hoje > t.data_vencimento ? "vencido" : "aberto",
    pix_copia_e_cola: t.pix_qr_code,
    linha_digitavel: t.boleto_linha_digitavel,
  });
});
