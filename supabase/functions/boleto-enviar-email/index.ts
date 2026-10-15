import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Envia o boleto (QR Pix, copia e cola, linha digitável e botão "Ver boleto") por e-mail, via n8n.
// verify_jwt = false; a função se autentica sozinha:
//  - cron: x-cron-secret conferido no banco. Percorre as escolas com email_boleto_ativo e envia as parcelas
//    com boleto registrado que vencem nos próximos N dias e ainda não receberam e-mail;
//  - tela: usuário logado com permissão de edição no financeiro da escola do título ({ financeiro_id }),
//    para enviar/reenviar um boleto específico (ignora a janela de dias).
const N8N_URL = Deno.env.get("EMAIL_N8N_EDU_URL") ?? "https://n8n.velociprime.com.br/webhook/email-envio-edu";
const SITE_URL = (Deno.env.get("SITE_URL_EDU") ?? "https://educacional.velociprime.com.br").replace(/\/$/, "");
const FUNCOES_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
const MAX_POR_ESCOLA = 150;
const CONCORRENCIA = 2;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hojeBrasilia = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const somaDias = (iso: string, dias: number) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

function formatarLinha(l: string) {
  const d = l.replace(/\D/g, "");
  if (d.length !== 47) return l;
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

// deno-lint-ignore no-explicit-any
type Linha = Record<string, any>;

function montarHtml(t: Linha, escolaNome: string, token: string): string {
  const aluno = String(t.matriculas?.alunos?.nome ?? "").trim().split(/\s+/)[0];
  const linkPagina = `${SITE_URL}/boleto/${token}`;
  const linkQr = `${FUNCOES_URL}/boleto-publico?t=${token}&qr=1`;
  const linkPdf = `${FUNCOES_URL}/boleto-pdf?t=${token}`;
  const valor = Number(t.valor);
  const integral = Number(t.valor_integral ?? t.valor);
  const temDesconto = integral - valor > 0.004;
  const linha = String(t.boleto_linha_digitavel ?? "");
  const pix = String(t.pix_qr_code ?? "");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;padding:28px">
<tr><td style="text-align:center">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${esc(escolaNome)}</div>
<h1 style="font-size:20px;margin:8px 0 4px">${esc(t.descricao)}</h1>
<div style="font-size:14px;color:#6b7280">Aluno(a): ${esc(aluno)}</div>
</td></tr>
<tr><td style="text-align:center;padding:22px 0 6px">
<div style="font-size:13px;color:#6b7280">Valor até ${dataBr(t.data_vencimento)}</div>
<div style="font-size:32px;font-weight:bold">${brl(valor)}</div>
<div style="font-size:13px;color:#6b7280;margin-top:4px">Vencimento: ${dataBr(t.data_vencimento)}${temDesconto ? ` &middot; Após o vencimento: ${brl(integral)} + multa e juros` : ""}</div>
</td></tr>
<tr><td style="text-align:center;padding:18px 0">
<a href="${linkPagina}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px">Ver boleto</a>
</td></tr>
${pix ? `<tr><td style="text-align:center;padding-top:8px">
<div style="font-weight:bold;margin-bottom:8px">Pagar com Pix</div>
<img src="${linkQr}" width="220" height="220" alt="QR Code Pix" style="border:1px solid #e5e7eb;border-radius:8px;background:#ffffff">
<div style="font-size:12px;color:#6b7280;margin:10px 0 4px">Pix copia e cola</div>
<div style="font-family:Consolas,monospace;font-size:11px;word-break:break-all;background:#f3f4f6;border-radius:6px;padding:10px;text-align:left">${esc(pix)}</div>
</td></tr>` : ""}
<tr><td style="padding-top:20px;text-align:center">
<div style="font-weight:bold;margin-bottom:8px">Pagar com boleto</div>
<div style="font-size:12px;color:#6b7280;margin-bottom:4px">Linha digitável</div>
<div style="font-family:Consolas,monospace;font-size:13px;word-break:break-all;background:#f3f4f6;border-radius:6px;padding:10px">${esc(formatarLinha(linha))}</div>
<div style="margin-top:12px"><a href="${linkPdf}" style="color:#2563eb;font-size:14px">Baixar boleto em PDF</a></div>
</td></tr>
<tr><td style="padding-top:22px;text-align:center;font-size:12px;color:#6b7280">
O pagamento é identificado automaticamente. Em caso de dúvida, responda este e-mail ou fale com a escola.
</td></tr>
</table></td></tr></table></body></html>`;
}

type Resultado = "enviado" | "sem_email" | "erro" | "ignorado";

async function enviarUm(db: SupabaseClient, segredo: string, financeiroId: string): Promise<{ r: Resultado; detalhe?: string }> {
  const { data: t } = await db.from("financeiro").select(`
      id, escola_id, descricao, valor, valor_integral, data_vencimento, status, gateway_status,
      pix_qr_code, boleto_linha_digitavel,
      matriculas ( alunos ( nome, email_responsavel ) ),
      escolas ( nome )
    `).eq("id", financeiroId).maybeSingle();
  if (!t) return { r: "ignorado", detalhe: "Título não encontrado." };
  if (t.status !== "Pendente" && t.status !== "Atrasado") return { r: "ignorado", detalhe: `Título ${t.status}.` };
  if (t.gateway_status !== "registrado" || !t.boleto_linha_digitavel) return { r: "ignorado", detalhe: "Boleto ainda não registrado." };

  const { data: token, error: errToken } = await db.rpc("boleto_link_garantir", { p_financeiro_id: t.id });
  if (errToken || !token) return { r: "erro", detalhe: "Falha ao criar o link: " + (errToken?.message ?? "sem token") };

  const para = String(t.matriculas?.alunos?.email_responsavel ?? "").trim();
  if (!EMAIL_OK.test(para)) {
    await db.from("boleto_links").update({ email_erro: "Responsável sem e-mail válido." }).eq("financeiro_id", t.id);
    return { r: "sem_email" };
  }

  const { data: cfg } = await db.from("escolas_integracao_bancaria").select("email_responder_para").eq("escola_id", t.escola_id).maybeSingle();
  const escolaNome = String(t.escolas?.nome ?? "Escola").trim();
  const venc = dataBr(t.data_vencimento);

  try {
    const resp = await fetch(N8N_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-email-secret": segredo },
      body: JSON.stringify({
        nomeRemetente: escolaNome,
        responderPara: cfg?.email_responder_para ?? null,
        para,
        assunto: `Boleto ${t.descricao} - vence em ${venc}`,
        html: montarHtml(t, escolaNome, token as string),
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const corpo = await resp.json().catch(() => null);
    if (!resp.ok || corpo?.ok !== true) throw new Error(corpo?.erro ?? `n8n respondeu ${resp.status}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("boleto_links").update({ email_erro: msg.slice(0, 300) }).eq("financeiro_id", t.id);
    return { r: "erro", detalhe: msg.slice(0, 200) };
  }

  await db.from("boleto_links")
    .update({ email_enviado_em: new Date().toISOString(), email_destino: para, email_erro: null }).eq("financeiro_id", t.id);
  return { r: "enviado" };
}

async function emPool<T>(itens: T[], n: number, fn: (i: T) => Promise<void>) {
  const fila = [...itens];
  await Promise.all(Array.from({ length: Math.min(n, fila.length) }, async () => {
    for (let i = fila.shift(); i !== undefined; i = fila.shift()) await fn(i);
  }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = admin();

  let corpo: Linha = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }

  const cronSecret = req.headers.get("x-cron-secret");
  let ehCron = false;
  if (cronSecret) {
    const { data: ok } = await db.rpc("sicredi_cron_ok", { p_segredo: cronSecret });
    if (ok !== true) return json({ ok: false, erro: "Não autorizado" }, 401);
    ehCron = true;
  }

  const { data: segredo } = await db.rpc("email_n8n_segredo");
  if (!segredo) return json({ ok: false, erro: "Segredo do e-mail não configurado." }, 500);

  // envio/reenvio de um título pela tela
  if (!ehCron) {
    const financeiroId = corpo.financeiro_id as string | undefined;
    if (!financeiroId) return json({ ok: false, erro: "financeiro_id é obrigatório." }, 400);
    const { data: t } = await db.from("financeiro").select("escola_id").eq("id", financeiroId).maybeSingle();
    if (!t) return json({ ok: false, erro: "Título não encontrado." });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, erro: "Não autorizado." }, 401);
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: pode, error } = await caller.rpc("usuario_tem_permissao", {
      p_escola_id: t.escola_id, p_modulo_codigo: "financeiro", p_acao: "editar",
    });
    if (error || pode !== true) return json({ ok: false, erro: "Você não tem permissão para enviar boletos desta escola." }, 403);

    const res = await enviarUm(db, segredo as string, financeiroId);
    if (res.r === "enviado") return json({ ok: true });
    if (res.r === "sem_email") return json({ ok: false, erro: "O responsável financeiro deste aluno não tem e-mail válido cadastrado." });
    return json({ ok: false, erro: res.detalhe ?? "Não foi possível enviar." });
  }

  // cron: escolas com envio ligado
  const escolaFiltro = corpo.escola_id as string | undefined;
  let q = db.from("escolas_integracao_bancaria").select("escola_id, email_boleto_dias_antes")
    .eq("ativo", true).eq("email_boleto_ativo", true);
  if (escolaFiltro) q = q.eq("escola_id", escolaFiltro);
  const { data: escolas, error: errEscolas } = await q;
  if (errEscolas) return json({ ok: false, erro: errEscolas.message }, 500);

  const hoje = hojeBrasilia();
  const resumo: Linha[] = [];

  for (const e of escolas ?? []) {
    const item = { escola_id: e.escola_id, candidatos: 0, enviados: 0, sem_email: 0, erros: 0, ignorados: 0 };
    const { data: parcelas } = await db.from("financeiro").select("id")
      .eq("escola_id", e.escola_id).eq("status", "Pendente").eq("gateway_status", "registrado")
      .gte("data_vencimento", hoje).lte("data_vencimento", somaDias(hoje, e.email_boleto_dias_antes))
      .order("data_vencimento").limit(MAX_POR_ESCOLA * 2);

    const ids = (parcelas ?? []).map((p) => p.id as string);
    const jaEnviados = new Set<string>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: links } = await db.from("boleto_links").select("financeiro_id, email_enviado_em")
        .in("financeiro_id", ids.slice(i, i + 200)).not("email_enviado_em", "is", null);
      for (const l of links ?? []) jaEnviados.add(l.financeiro_id as string);
    }
    const fila = ids.filter((id) => !jaEnviados.has(id)).slice(0, MAX_POR_ESCOLA);
    item.candidatos = fila.length;

    await emPool(fila, CONCORRENCIA, async (id) => {
      const res = await enviarUm(db, segredo as string, id);
      if (res.r === "enviado") item.enviados++;
      else if (res.r === "sem_email") item.sem_email++;
      else if (res.r === "erro") item.erros++;
      else item.ignorados++;
    });
    resumo.push(item);
  }

  return json({ ok: true, escolas: resumo });
});
