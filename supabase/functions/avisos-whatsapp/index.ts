import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Avisos por WhatsApp: conectar o número por QR code e disparar uma mensagem de texto pro responsável
// financeiro, pai, mãe ou ambos de um aluno específico, ou de todos os alunos ativos da escola.
//
// O Supabase roda na nuvem e não alcança o WAHA (só existe na rede interna da VPS): por isso toda
// conversa com o WAHA passa por um webhook do n8n, do mesmo jeito que o e-mail do boleto. Este
// function não guarda nem vê a chave do WAHA — ela fica só no n8n.
//
// verify_jwt = true (default): cada chamada já chega autenticada com o JWT de quem está logado; a
// permissão na escola é conferida abaixo via usuario_tem_permissao.
const N8N_URL = Deno.env.get("WHATSAPP_N8N_EDU_URL") ?? "https://n8n.velociprime.com.br/webhook/whatsapp-avisos-edu";
const MAX_DESTINATARIOS_TODOS = 3000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

// deno-lint-ignore no-explicit-any
type Linha = Record<string, any>;

function normalizarTelefone(v: string | null | undefined): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length === 10 || d.length === 11) return "55" + d;
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d;
  return null;
}

const PARENTESCO_LABEL: Record<string, string> = { pai: "Pai", mae: "Mãe", responsavel: "Responsável financeiro" };

/** Confere, com a identidade de QUEM CHAMA, se tem a permissão pedida na escola. */
async function temPermissao(req: Request, escolaId: string, acao: "visualizar" | "editar"): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return false;
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await caller.rpc("usuario_tem_permissao", { p_escola_id: escolaId, p_modulo_codigo: "comunicacao", p_acao: acao });
  return !error && data === true;
}

async function sessaoDaEscola(db: SupabaseClient, escolaId: string): Promise<{ sessao: string } | null> {
  const { data } = await db.from("escolas_whatsapp_avisos").select("sessao").eq("escola_id", escolaId).eq("ativo", true).maybeSingle();
  return data ? { sessao: data.sessao as string } : null;
}

/** Segredo compartilhado com o n8n (reaproveita o mesmo da automação de e-mail: é só "isto é o nosso app falando"). */
async function segredoN8n(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.rpc("email_n8n_segredo");
  return (data as string | null) ?? null;
}

async function chamarN8n(db: SupabaseClient, corpo: Linha, timeoutMs = 20_000) {
  const segredo = await segredoN8n(db);
  if (!segredo) throw new Error("Segredo da automação não configurado.");
  const resp = await fetch(N8N_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-automacao-secret": segredo },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const texto = await resp.text();
  let dados: Linha | null = null;
  try { dados = JSON.parse(texto); } catch { /* resposta vazia/; tratamos abaixo */ }
  if (!resp.ok) throw new Error(dados?.erro ?? `n8n respondeu ${resp.status}`);
  return dados ?? {};
}

/** Alunos (status Ativo) e os contatos de pai/mãe/responsável, pra busca na tela e pra "enviar a todos". */
async function carregarAlunosComContatos(db: SupabaseClient, escolaId: string, termo?: string, limite = 2000) {
  let q = db.from("alunos")
    .select("id, nome, nome_pai, telefone_pai, nome_mae, telefone_mae, responsavel_financeiro, telefone_responsavel")
    .eq("escola_id", escolaId).eq("status", "Ativo").order("nome").limit(limite);
  if (termo) q = q.ilike("nome", `%${termo}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

type Contato = { parentesco: "pai" | "mae" | "responsavel"; nome: string | null; telefoneCru: string | null };
function contatosDoAluno(a: Linha, personas: string[]): Contato[] {
  const todos: Contato[] = [
    { parentesco: "pai", nome: a.nome_pai, telefoneCru: a.telefone_pai },
    { parentesco: "mae", nome: a.nome_mae, telefoneCru: a.telefone_mae },
    { parentesco: "responsavel", nome: a.responsavel_financeiro, telefoneCru: a.telefone_responsavel },
  ];
  return todos.filter((c) => personas.includes(c.parentesco));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const db = admin();

  let corpo: Linha = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  const acao = String(corpo.acao ?? "");
  const escolaId = corpo.escola_id as string | undefined;
  if (!escolaId) return json({ ok: false, erro: "escola_id é obrigatório." }, 400);

  try {
    if (acao === "status" || acao === "qr") {
      if (!(await temPermissao(req, escolaId, "visualizar"))) return json({ ok: false, erro: "Sem permissão." }, 403);
      const cfg = await sessaoDaEscola(db, escolaId);
      if (!cfg) return json({ ok: true, habilitado: false });
      const r = await chamarN8n(db, { acao, sessao: cfg.sessao });
      return json({ ok: true, habilitado: true, ...r });
    }

    if (acao === "conectar" || acao === "desconectar") {
      if (!(await temPermissao(req, escolaId, "editar"))) return json({ ok: false, erro: "Sem permissão." }, 403);
      const cfg = await sessaoDaEscola(db, escolaId);
      if (!cfg) return json({ ok: false, erro: "O WhatsApp ainda não está liberado para esta escola." }, 400);
      const r = await chamarN8n(db, { acao, sessao: cfg.sessao });
      return json({ ok: true, ...r });
    }

    if (acao === "buscar_alunos") {
      if (!(await temPermissao(req, escolaId, "visualizar"))) return json({ ok: false, erro: "Sem permissão." }, 403);
      const termo = String(corpo.termo ?? "").trim();
      const alunos = await carregarAlunosComContatos(db, escolaId, termo || undefined, 30);
      return json({
        ok: true,
        alunos: alunos.map((a) => ({
          id: a.id, nome: a.nome,
          contatos: contatosDoAluno(a, ["pai", "mae", "responsavel"]).map((c) => ({
            parentesco: c.parentesco, nome: c.nome, telefone: normalizarTelefone(c.telefoneCru) ? c.telefoneCru : null,
          })),
        })),
      });
    }

    if (acao === "criar_envio") {
      if (!(await temPermissao(req, escolaId, "editar"))) return json({ ok: false, erro: "Sem permissão." }, 403);
      const cfg = await sessaoDaEscola(db, escolaId);
      if (!cfg) return json({ ok: false, erro: "O WhatsApp ainda não está liberado para esta escola." }, 400);

      const mensagem = String(corpo.mensagem ?? "").trim();
      if (!mensagem) return json({ ok: false, erro: "A mensagem não pode ficar vazia." }, 400);
      const destinoTipo = corpo.destino_tipo === "aluno" ? "aluno" : corpo.destino_tipo === "todos" ? "todos" : null;
      if (!destinoTipo) return json({ ok: false, erro: "Informe o destino: um aluno ou todos." }, 400);
      const personas = Array.isArray(corpo.personas) ? corpo.personas.filter((p: unknown) => ["pai", "mae", "responsavel"].includes(String(p))) : [];
      if (personas.length === 0) return json({ ok: false, erro: "Escolha quem recebe: responsável financeiro, pai, mãe ou ambos." }, 400);

      let alunoId: string | null = null;
      let alunoNomeUnico: string | null = null;
      let alunos: Linha[];
      if (destinoTipo === "aluno") {
        alunoId = String(corpo.aluno_id ?? "");
        if (!alunoId) return json({ ok: false, erro: "Escolha o aluno." }, 400);
        const { data: a, error } = await db.from("alunos")
          .select("id, nome, nome_pai, telefone_pai, nome_mae, telefone_mae, responsavel_financeiro, telefone_responsavel")
          .eq("id", alunoId).eq("escola_id", escolaId).maybeSingle();
        if (error || !a) return json({ ok: false, erro: "Aluno não encontrado nesta escola." }, 400);
        alunos = [a]; alunoNomeUnico = a.nome as string;
      } else {
        alunos = await carregarAlunosComContatos(db, escolaId, undefined, MAX_DESTINATARIOS_TODOS);
        if (alunos.length === 0) return json({ ok: false, erro: "Nenhum aluno ativo encontrado." }, 400);
      }

      // Monta um item por (aluno, persona escolhida). Sem telefone cadastrado: ainda registra, pra
      // aparecer no histórico como "sem telefone" em vez de simplesmente sumir da lista.
      const itens: Linha[] = [];
      for (const a of alunos) {
        for (const c of contatosDoAluno(a, personas)) {
          const telefone = normalizarTelefone(c.telefoneCru);
          itens.push({
            aluno_id: a.id, aluno_nome: a.nome, parentesco: c.parentesco,
            destinatario_nome: c.nome ?? null, telefone,
            status: telefone ? "pendente" : "sem_telefone",
          });
        }
      }
      if (itens.length === 0) return json({ ok: false, erro: "Nenhum destinatário encontrado para esta escolha." }, 400);

      const semTelefone = itens.filter((i) => i.status === "sem_telefone").length;
      const comTelefone = itens.length - semTelefone;
      if (comTelefone === 0) {
        return json({ ok: false, erro: `Nenhum dos ${itens.length} destinatário(s) tem telefone cadastrado para o(s) tipo(s) escolhido(s).` }, 400);
      }

      const { data: aviso, error: errAviso } = await db.from("avisos_whatsapp").insert({
        escola_id: escolaId, mensagem, destino_tipo: destinoTipo, aluno_id: alunoId, aluno_nome: alunoNomeUnico,
        personas, status: "enviando", total_destinatarios: comTelefone, total_sem_telefone: semTelefone,
      }).select("id").single();
      if (errAviso || !aviso) return json({ ok: false, erro: errAviso?.message ?? "Falha ao criar o envio." }, 500);

      const { data: itensSalvos, error: errItens } = await db.from("avisos_whatsapp_itens")
        .insert(itens.map((i) => ({ ...i, aviso_id: aviso.id })))
        .select("id, telefone, status");
      if (errItens) {
        await db.from("avisos_whatsapp").update({ status: "erro", erro: errItens.message.slice(0, 300) }).eq("id", aviso.id);
        return json({ ok: false, erro: "Falha ao gravar os destinatários." }, 500);
      }

      const fila = (itensSalvos ?? []).filter((i) => i.status === "pendente").map((i) => ({ item_id: i.id, telefone: i.telefone as string }));
      try {
        await chamarN8n(db, { acao: "enviar", sessao: cfg.sessao, aviso_id: aviso.id, mensagem, itens: fila }, 15_000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("avisos_whatsapp").update({ status: "erro", erro: msg.slice(0, 300) }).eq("id", aviso.id);
        await db.from("avisos_whatsapp_itens").update({ status: "erro", erro: "Não foi possível iniciar o envio." })
          .eq("aviso_id", aviso.id).eq("status", "pendente");
        return json({ ok: false, erro: "Não foi possível iniciar o envio: " + msg }, 502);
      }

      return json({ ok: true, aviso_id: aviso.id, total_destinatarios: comTelefone, total_sem_telefone: semTelefone });
    }

    return json({ ok: false, erro: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message.slice(0, 300) : String(e) }, 500);
  }
});
