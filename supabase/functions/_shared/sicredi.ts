// Camada de I/O da integração Sicredi (Deno). A lógica pura fica em sicredi-core.ts.
// NUNCA devolver/logar credenciais (código de acesso, x-api-key, tokens).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  cooperativaDe, postoDe, beneficiarioDe, usernameSicredi, urlToken, urlBoletos,
  montarPayloadBoleto, parseRespostaRegistro, idTituloEmpresaDe, urlsWebhookContrato,
  type RegistroBoleto,
} from "./sicredi-core.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const USER_AGENT = "VelociEducacional/1.0 (+edge-function)";

export class ErroSicredi extends Error {
  status: number;
  constructor(mensagem: string, status = 0) {
    super(mensagem);
    this.status = status;
  }
}

export type ConfigIntegracao = {
  escola_id: string;
  agencia: string;
  posto: string;
  conta_corrente: string;
  codigo_beneficiario: string;
  codigo_acesso: string;
  x_api_key: string;
  chave_pix: string;
  ambiente: string;
  ativo: boolean;
  conta_bancaria_id: string | null;
  multa_percentual: number;
  juros_mensal_percentual: number;
  tipo_cobranca: string;
  especie_documento: string;
  registrar_na_matricula: boolean;
  webhook_segredo: string | null;
  webhook_contrato_id: string | null;
  webhook_status: string | null;
};

export function clienteAdmin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Confere no banco, com a identidade de QUEM CHAMA, se ele tem a permissão na escola. */
export async function usuarioTemPermissao(
  req: Request, escolaId: string, modulo: string, acao: string
): Promise<boolean> {
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

export async function carregarConfig(admin: SupabaseClient, escolaId: string): Promise<ConfigIntegracao> {
  const { data, error } = await admin
    .from("escolas_integracao_bancaria").select("*").eq("escola_id", escolaId).maybeSingle();
  if (error) throw new ErroSicredi("Erro ao ler a configuração da integração: " + error.message);
  if (!data) throw new ErroSicredi("Esta escola ainda não configurou a integração com o Sicredi.");
  if (!data.ativo) throw new ErroSicredi("A integração com o Sicredi está desativada para esta escola.");
  if (!data.codigo_acesso || !data.x_api_key) throw new ErroSicredi("Faltam o código de acesso e/ou a x-api-key do Sicredi.");
  return data as ConfigIntegracao;
}

function mensagemDeErro(status: number, texto: string): string {
  let msg = texto.trim().slice(0, 300);
  try {
    const j = JSON.parse(texto);
    const partes = [j?.mensagem, j?.message, j?.descricao, j?.error_description, j?.error, j?.detalhe]
      .filter((x) => typeof x === "string" && x);
    if (Array.isArray(j?.erros) || Array.isArray(j?.errors)) {
      for (const e of (j.erros ?? j.errors)) {
        const t = typeof e === "string" ? e : (e?.mensagem ?? e?.message);
        if (t) partes.push(t);
      }
    }
    if (partes.length > 0) msg = partes.join(" | ").slice(0, 400);
  } catch { /* corpo não é JSON */ }
  return `Sicredi respondeu ${status}: ${msg || "sem detalhes"}`;
}

async function fetchComTimeout(url: string, init: RequestInit, ms = 25000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new ErroSicredi("Sicredi não respondeu a tempo (timeout).");
    throw new ErroSicredi("Falha de rede ao falar com o Sicredi: " + (e instanceof Error ? e.message : String(e)));
  } finally {
    clearTimeout(t);
  }
}

/**
 * Access token com cache em sicredi_tokens (o manual pede pra NÃO autenticar a cada
 * chamada). Usa o refresh_token enquanto válido; senão, senha.
 */
export async function obterAccessToken(
  admin: SupabaseClient, cfg: ConfigIntegracao, forcarNovo = false
): Promise<string> {
  const agora = Date.now();
  const { data: tok } = await admin.from("sicredi_tokens").select("*").eq("escola_id", cfg.escola_id).maybeSingle();

  if (!forcarNovo && tok && new Date(tok.access_expires_at).getTime() - agora > 30_000) {
    return tok.access_token as string;
  }

  const cabecalhos = {
    "Content-Type": "application/x-www-form-urlencoded",
    "x-api-key": cfg.x_api_key,
    context: "COBRANCA",
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };

  const tentarSenha = () => new URLSearchParams({
    username: usernameSicredi(cfg.codigo_beneficiario, cfg.agencia),
    password: cfg.codigo_acesso,
    scope: "cobranca",
    grant_type: "password",
  });

  const usarRefresh = !forcarNovo && tok?.refresh_token && tok.refresh_expires_at &&
    new Date(tok.refresh_expires_at).getTime() - agora > 30_000;

  let resp = await fetchComTimeout(urlToken(cfg.ambiente), {
    method: "POST", headers: cabecalhos,
    body: usarRefresh
      ? new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok!.refresh_token as string })
      : tentarSenha(),
  });
  let texto = await resp.text();

  // refresh recusado -> cai pro fluxo com senha uma vez
  if (!resp.ok && usarRefresh) {
    resp = await fetchComTimeout(urlToken(cfg.ambiente), { method: "POST", headers: cabecalhos, body: tentarSenha() });
    texto = await resp.text();
  }

  if (!resp.ok) throw new ErroSicredi(mensagemDeErro(resp.status, texto), resp.status);

  // deno-lint-ignore no-explicit-any
  let corpo: any;
  try { corpo = JSON.parse(texto); } catch { throw new ErroSicredi("Resposta de autenticação do Sicredi não é JSON."); }
  if (!corpo?.access_token) throw new ErroSicredi("Sicredi não devolveu o access_token.");

  const expiraEm = new Date(agora + Number(corpo.expires_in ?? 300) * 1000).toISOString();
  const refreshExpira = corpo.refresh_token
    ? new Date(agora + Number(corpo.refresh_expires_in ?? 900) * 1000).toISOString() : null;

  await admin.from("sicredi_tokens").upsert({
    escola_id: cfg.escola_id,
    access_token: corpo.access_token,
    access_expires_at: expiraEm,
    refresh_token: corpo.refresh_token ?? null,
    refresh_expires_at: refreshExpira,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "escola_id" });

  return corpo.access_token as string;
}

type OpcoesChamada = {
  metodo: "GET" | "POST" | "PATCH" | "PUT";
  url: string;
  corpo?: unknown;
  incluirBeneficiario?: boolean; // instruções (baixa) exigem o header codigoBeneficiario
};

async function chamar(admin: SupabaseClient, cfg: ConfigIntegracao, op: OpcoesChamada, forcarToken = false) {
  const token = await obterAccessToken(admin, cfg, forcarToken);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "x-api-key": cfg.x_api_key,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    cooperativa: cooperativaDe(cfg.agencia),
    posto: postoDe(cfg.posto),
  };
  if (op.incluirBeneficiario) headers.codigoBeneficiario = beneficiarioDe(cfg.codigo_beneficiario);

  const resp = await fetchComTimeout(op.url, {
    method: op.metodo, headers,
    body: op.corpo === undefined ? undefined : JSON.stringify(op.corpo),
  });
  const texto = await resp.text();

  // token pode ter sido invalidado antes do prazo: renova e tenta de novo uma vez
  if (resp.status === 401 && !forcarToken) return chamar(admin, cfg, op, true);

  return { status: resp.status, ok: resp.ok, texto };
}

export async function registrarBoleto(
  admin: SupabaseClient, cfg: ConfigIntegracao, payload: Record<string, unknown>
): Promise<RegistroBoleto> {
  const r = await chamar(admin, cfg, { metodo: "POST", url: urlBoletos(cfg.ambiente), corpo: payload });
  if (!r.ok) throw new ErroSicredi(mensagemDeErro(r.status, r.texto), r.status);
  try { return parseRespostaRegistro(JSON.parse(r.texto)); }
  catch (e) { throw new ErroSicredi(e instanceof Error ? e.message : "Resposta inesperada do Sicredi ao registrar."); }
}

/** Pedido de baixa (cancelamento). O Sicredi responde 202: a baixa é processada de forma assíncrona. */
export async function baixarBoleto(admin: SupabaseClient, cfg: ConfigIntegracao, nossoNumero: string): Promise<void> {
  const r = await chamar(admin, cfg, {
    metodo: "PATCH", url: `${urlBoletos(cfg.ambiente)}/${encodeURIComponent(nossoNumero)}/baixa`,
    corpo: {}, incluirBeneficiario: true,
  });
  if (!r.ok) throw new ErroSicredi(mensagemDeErro(r.status, r.texto), r.status);
}

/** Recupera um boleto já registrado pelo idTituloEmpresa (idempotência quando a resposta do cadastro se perdeu). */
// deno-lint-ignore no-explicit-any
export async function consultarPorIdTitulo(admin: SupabaseClient, cfg: ConfigIntegracao, idTitulo: string): Promise<any | null> {
  const url = `${urlBoletos(cfg.ambiente)}/cadastrados?codigoBeneficiario=${beneficiarioDe(cfg.codigo_beneficiario)}&idTituloEmpresa=${encodeURIComponent(idTitulo)}`;
  const r = await chamar(admin, cfg, { metodo: "GET", url });
  if (r.status === 404 || r.status === 422) return null;
  if (!r.ok) throw new ErroSicredi(mensagemDeErro(r.status, r.texto), r.status);
  try { return JSON.parse(r.texto); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Registro de uma parcela do financeiro
// ---------------------------------------------------------------------------
export type ResultadoRegistro =
  | { ok: true; jaRegistrado: boolean; nossoNumero: string }
  | { ok: false; erro: string; dadosInvalidos?: boolean };

async function gravarErro(admin: SupabaseClient, financeiroId: string, erro: string) {
  await admin.from("financeiro").update({ gateway_status: "erro", gateway_erro: erro.slice(0, 500) }).eq("id", financeiroId);
}

export async function registrarParcela(admin: SupabaseClient, financeiroId: string): Promise<ResultadoRegistro> {
  const { data: t, error } = await admin.from("financeiro").select(`
      id, escola_id, descricao, valor, valor_integral, data_vencimento, status, tipo,
      gateway_cobranca_id, gateway_status,
      matriculas ( alunos ( nome, responsavel_financeiro, responsavel_cpf, responsavel_cep, responsavel_cidade,
                            responsavel_uf, endereco, email_responsavel, telefone_responsavel ),
                   turmas ( nome ) )
    `).eq("id", financeiroId).maybeSingle();

  if (error) return { ok: false, erro: "Erro ao ler o título: " + error.message };
  if (!t) return { ok: false, erro: "Título não encontrado." };

  if (t.gateway_cobranca_id && t.gateway_status === "registrado") {
    return { ok: true, jaRegistrado: true, nossoNumero: t.gateway_cobranca_id };
  }
  if (t.status !== "Pendente" && t.status !== "Atrasado") {
    return { ok: false, erro: `Só dá pra registrar boleto de título Pendente/Atrasado (este está ${t.status}).` };
  }

  let cfg: ConfigIntegracao;
  try { cfg = await carregarConfig(admin, t.escola_id); }
  catch (e) { return { ok: false, erro: e instanceof Error ? e.message : String(e) }; }

  // deno-lint-ignore no-explicit-any
  const aluno: any = (t as any).matriculas?.alunos ?? {};
  // deno-lint-ignore no-explicit-any
  const turma: string = (t as any).matriculas?.turmas?.nome ?? "";

  const mensagens = [
    `Aluno: ${aluno.nome ?? ""}`,
    `${t.descricao}${turma ? " - " + turma : ""}`,
  ];
  if (cfg.multa_percentual > 0 || cfg.juros_mensal_percentual > 0) {
    const partes = [];
    if (cfg.multa_percentual > 0) partes.push(`multa de ${cfg.multa_percentual}%`);
    if (cfg.juros_mensal_percentual > 0) partes.push(`juros de ${cfg.juros_mensal_percentual}% ao mês`);
    mensagens.push(`Após o vencimento: ${partes.join(" + ")}.`);
  }

  const montado = montarPayloadBoleto(
    { id: t.id, valor: Number(t.valor), valor_integral: t.valor_integral == null ? null : Number(t.valor_integral), data_vencimento: t.data_vencimento },
    {
      nome: aluno.responsavel_financeiro, documento: aluno.responsavel_cpf, endereco: aluno.endereco,
      cidade: aluno.responsavel_cidade, uf: aluno.responsavel_uf, cep: aluno.responsavel_cep,
      email: aluno.email_responsavel, telefone: aluno.telefone_responsavel,
    },
    cfg, { mensagens }
  );

  if (!montado.ok) {
    const erro = montado.erros.join(" ");
    await gravarErro(admin, t.id, erro);
    return { ok: false, erro, dadosInvalidos: true };
  }

  try {
    // Se uma tentativa anterior falhou de forma ambígua (timeout etc.), o boleto pode já existir no banco.
    let registro: RegistroBoleto | null = null;
    // (não vale se este título já teve um boleto baixado por nós: o que existe no banco é o boleto morto)
    if (t.gateway_status === "erro") {
      const { count: baixas } = await admin.from("cobranca_fila").select("id", { count: "exact", head: true })
        .eq("financeiro_id", t.id).eq("operacao", "baixar");
      if (!baixas) {
        const existente = await consultarPorIdTitulo(admin, cfg, idTituloEmpresaDe(t.id));
        if (existente?.nossoNumero && existente?.linhaDigitavel) registro = parseRespostaRegistro(existente);
      }
    }
    if (!registro) registro = await registrarBoleto(admin, cfg, montado.payload);

    const gravar = () => admin.from("financeiro").update({
      gateway_cobranca_id: registro!.nossoNumero,
      boleto_linha_digitavel: registro!.linhaDigitavel,
      pix_qr_code: registro!.qrCode,
      gateway_txid: registro!.txid,
      gateway_status: "registrado",
      gateway_registrado_em: new Date().toISOString(),
      gateway_erro: null,
    }).eq("id", t.id);

    let { error: errGravar } = await gravar();
    if (errGravar) ({ error: errGravar } = await gravar()); // 1 nova tentativa: o boleto já existe no banco
    if (errGravar) {
      return { ok: false, erro: `Boleto registrado no Sicredi (nosso número ${registro.nossoNumero}) mas não consegui gravar no sistema: ${errGravar.message}` };
    }
    return { ok: true, jaRegistrado: false, nossoNumero: registro.nossoNumero };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await gravarErro(admin, t.id, erro);
    return { ok: false, erro };
  }
}

// ---------------------------------------------------------------------------
// Contrato de webhook (o Sicredi passa a chamar a nossa URL a cada liquidação)
// ---------------------------------------------------------------------------
/** Cria o contrato; se já existir um pra este beneficiário (422), consulta o id e altera. Devolve o idContrato. */
export async function contratarWebhook(
  admin: SupabaseClient, cfg: ConfigIntegracao,
  dados: { url: string; header: string; token: string }
): Promise<string> {
  const corpo = {
    cooperativa: cooperativaDe(cfg.agencia),
    posto: postoDe(cfg.posto),
    codBeneficiario: beneficiarioDe(cfg.codigo_beneficiario),
    eventos: ["LIQUIDACAO"],
    url: dados.url,
    urlStatus: "ATIVO",
    contratoStatus: "ATIVO",
    enviarIdTituloEmpresa: true,
    header: dados.header,
    token: dados.token,
  };

  // tenta os endereços conhecidos; 404/erro de rede = endereço errado, passa pro próximo
  let base = "";
  let criar: { status: number; ok: boolean; texto: string } | null = null;
  const falhas: string[] = [];
  for (const candidato of urlsWebhookContrato(cfg.ambiente)) {
    try {
      const r = await chamar(admin, cfg, { metodo: "POST", url: candidato + "/", corpo });
      if (r.status === 404) { falhas.push(`${candidato}: 404`); continue; }
      base = candidato; criar = r; break;
    } catch (e) {
      if (e instanceof ErroSicredi && e.status === 0) { falhas.push(`${candidato}: ${e.message}`); continue; }
      throw e;
    }
  }
  if (!criar) throw new ErroSicredi("Nenhum endereço de webhook do Sicredi respondeu (" + falhas.join("; ") + ").");

  if (criar.ok) {
    try { const j = JSON.parse(criar.texto); if (j?.idContrato) return String(j.idContrato); } catch { /* segue */ }
    throw new ErroSicredi("Sicredi criou o contrato mas não devolveu o idContrato.");
  }
  // 422 também é usado pra "beneficiário não encontrado" etc.: só é "já existe" se a mensagem disser isso
  if (criar.status !== 422 || !/j[áa] existe|existente/i.test(criar.texto)) {
    throw new ErroSicredi(mensagemDeErro(criar.status, criar.texto), criar.status);
  }

  // já existe: acha o id e altera
  const params = `cooperativa=${corpo.cooperativa}&posto=${corpo.posto}&beneficiario=${corpo.codBeneficiario}`;
  const lista = await chamar(admin, cfg, { metodo: "GET", url: `${base.replace(/contrato$/, "contratos")}/?${params}` });
  if (!lista.ok) throw new ErroSicredi(mensagemDeErro(lista.status, lista.texto), lista.status);
  let id: string | undefined;
  try {
    const j = JSON.parse(lista.texto);
    const item = Array.isArray(j) ? j[0] : (j?.contratos?.[0] ?? j?.content?.[0] ?? j);
    id = item?.idContrato ? String(item.idContrato) : undefined;
  } catch { /* cai no erro abaixo */ }
  if (!id) throw new ErroSicredi("Já existe contrato de webhook, mas não consegui descobrir o id dele.");

  const alterar = await chamar(admin, cfg, { metodo: "PUT", url: `${base}/${encodeURIComponent(id)}`, corpo });
  if (!alterar.ok) throw new ErroSicredi(mensagemDeErro(alterar.status, alterar.texto), alterar.status);
  return id;
}

// ---------------------------------------------------------------------------
// Boletos liquidados (rede de segurança do webhook)
// ---------------------------------------------------------------------------
export type BoletoLiquidado = {
  nossoNumero: string;
  valorLiquidado: number;
  dataPagamento: string; // YYYY-MM-DD
  tipoLiquidacao: string;
};

/** Lista tudo que o banco liquidou num dia (DD/MM/YYYY), percorrendo as páginas de 500 registros. */
export async function listarLiquidadosDoDia(
  admin: SupabaseClient, cfg: ConfigIntegracao, dia: string
): Promise<BoletoLiquidado[]> {
  const todos: BoletoLiquidado[] = [];
  for (let pagina = 0; pagina < 20; pagina++) {
    const url = `${urlBoletos(cfg.ambiente)}/liquidados/dia?codigoBeneficiario=${beneficiarioDe(cfg.codigo_beneficiario)}` +
      `&dia=${encodeURIComponent(dia)}&pagina=${pagina}`;
    const r = await chamar(admin, cfg, { metodo: "GET", url });
    if (r.status === 404) break;
    if (!r.ok) throw new ErroSicredi(mensagemDeErro(r.status, r.texto), r.status);
    // deno-lint-ignore no-explicit-any
    let j: any;
    try { j = JSON.parse(r.texto); } catch { throw new ErroSicredi("Resposta de liquidados não é JSON."); }
    for (const it of (j?.items ?? [])) {
      if (!it?.nossoNumero) continue;
      todos.push({
        nossoNumero: String(it.nossoNumero),
        valorLiquidado: Number(it.valorLiquidado ?? it.valor ?? 0),
        dataPagamento: String(it.dataPagamento ?? "").slice(0, 10),
        tipoLiquidacao: String(it.tipoLiquidacao ?? ""),
      });
    }
    if (String(j?.hasNext) !== "true") break;
  }
  return todos;
}
