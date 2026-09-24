// Núcleo puro (sem rede, sem banco) da integração com a API de Cobrança do
// Sicredi. Baseado no "Manual da API da Cobrança" v3.9.1 (25/03/2026).
// Testado com vitest em src/test/sicredi-core.test.ts.

const HOST = "https://api-parceiro.sicredi.com.br";

// Sandbox usa o prefixo /sb; produção não tem prefixo.
const prefixo = (ambiente: string) => (ambiente === "producao" ? "" : "/sb");

export const urlToken = (ambiente: string) => `${HOST}${prefixo(ambiente)}/auth/openapi/token`;
export const urlBoletos = (ambiente: string) => `${HOST}${prefixo(ambiente)}/cobranca/boleto/v1/boletos`;

export const somenteDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

function padDigitos(valor: string, tamanho: number, rotulo: string): string {
  const d = somenteDigitos(valor);
  if (d.length === 0) throw new Error(`${rotulo} não informado`);
  if (d.length > tamanho) throw new Error(`${rotulo} deve ter no máximo ${tamanho} dígitos`);
  return d.padStart(tamanho, "0");
}

export const cooperativaDe = (agencia: string) => padDigitos(agencia, 4, "Agência (cooperativa)");
export const postoDe = (posto: string) => padDigitos(posto, 2, "Posto");
export const beneficiarioDe = (codigo: string) => padDigitos(codigo, 5, "Código do beneficiário");

/** username da autenticação = código do beneficiário (5) + cooperativa (4), sem separador. */
export function usernameSicredi(codigoBeneficiario: string, agencia: string): string {
  return beneficiarioDe(codigoBeneficiario) + cooperativaDe(agencia);
}

// ---------------------------------------------------------------------------
// idTituloEmpresa (até 25 chars) / seuNumero (até 10 chars) a partir do UUID
// da parcela. 128 bits em base36 cabem em 25 caracteres.
// ---------------------------------------------------------------------------
export function uuidParaBase36(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new Error("UUID inválido");
  return BigInt("0x" + hex).toString(36).padStart(25, "0");
}

export function base36ParaUuid(b36: string): string {
  let n = BigInt(0);
  for (const ch of b36.toLowerCase()) {
    const d = parseInt(ch, 36);
    if (Number.isNaN(d)) throw new Error("idTituloEmpresa inválido");
    n = n * BigInt(36) + BigInt(d);
  }
  const hex = n.toString(16).padStart(32, "0");
  if (hex.length > 32) throw new Error("idTituloEmpresa inválido");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const idTituloEmpresaDe = (parcelaId: string) => uuidParaBase36(parcelaId);
export const seuNumeroDe = (parcelaId: string) => uuidParaBase36(parcelaId).slice(-10).toUpperCase();

// ---------------------------------------------------------------------------
// Montagem do boleto
// ---------------------------------------------------------------------------
export type ParcelaBoleto = {
  id: string;
  valor: number; // valor a pagar até o vencimento (já com desconto)
  valor_integral: number | null; // valor cheio (sem desconto)
  data_vencimento: string; // YYYY-MM-DD
};

export type PagadorBoleto = {
  nome: string | null;
  documento: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export type ConfigBoleto = {
  codigo_beneficiario: string;
  tipo_cobranca: string; // HIBRIDO | NORMAL
  especie_documento: string;
  multa_percentual: number;
  juros_mensal_percentual: number;
};

export type ResultadoPayload =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; erros: string[] };

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const cortar = (s: string, max: number) => s.trim().replace(/\s+/g, " ").slice(0, max);

/**
 * Monta o JSON de "Cadastro de Boletos".
 *
 * Regra de pontualidade no banco: o boleto é registrado pelo valor cheio
 * (valor_integral) com um desconto de (integral - valor) válido até o
 * vencimento - assim o próprio banco cobra o valor cheio depois do vencimento.
 *
 * NÃO enviamos dataInicioJuros/dataInicioMulta: segundo o manual, informar essas
 * datas faz o boleto virar tradicional (sem QR Code Pix).
 */
export function montarPayloadBoleto(
  parcela: ParcelaBoleto,
  pagador: PagadorBoleto,
  config: ConfigBoleto,
  extras: { mensagens?: string[]; informativos?: string[] } = {}
): ResultadoPayload {
  const erros: string[] = [];

  const pago = r2(Number(parcela.valor));
  const integral = r2(Number(parcela.valor_integral ?? parcela.valor));
  if (!(pago > 0)) erros.push("Título sem valor a cobrar (R$ 0,00) — bolsa integral não gera boleto.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(parcela.data_vencimento ?? "")) erros.push("Data de vencimento inválida.");

  const nome = cortar(pagador.nome ?? "", 200);
  if (!nome) erros.push("Nome do responsável financeiro não informado.");

  const doc = somenteDigitos(pagador.documento);
  if (doc.length !== 11 && doc.length !== 14) erros.push("CPF/CNPJ do responsável financeiro ausente ou inválido.");

  const cep = somenteDigitos(pagador.cep);
  if (cep.length !== 8) erros.push("CEP do responsável ausente ou inválido (8 dígitos).");

  const cidade = cortar(pagador.cidade ?? "", 40);
  if (!cidade) erros.push("Cidade do responsável não informada.");

  const uf = (pagador.uf ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(uf)) erros.push("UF do responsável ausente ou inválida.");

  if (erros.length > 0) return { ok: false, erros };

  const pagadorJson: Record<string, unknown> = {
    tipoPessoa: doc.length === 11 ? "PESSOA_FISICA" : "PESSOA_JURIDICA",
    documento: doc,
    nome,
    cidade,
    uf,
    cep,
  };
  const endereco = cortar(pagador.endereco ?? "", 40);
  if (endereco) pagadorJson.endereco = endereco;
  const email = (pagador.email ?? "").trim();
  if (email && email.length <= 40 && /^\S+@\S+\.\S+$/.test(email)) pagadorJson.email = email;
  const tel = somenteDigitos(pagador.telefone);
  if (tel.length >= 10 && tel.length <= 11) pagadorJson.telefone = tel;

  const payload: Record<string, unknown> = {
    codigoBeneficiario: beneficiarioDe(config.codigo_beneficiario),
    dataVencimento: parcela.data_vencimento,
    pagador: pagadorJson,
    tipoCobranca: config.tipo_cobranca === "NORMAL" ? "NORMAL" : "HIBRIDO",
    especieDocumento: config.especie_documento,
    seuNumero: seuNumeroDe(parcela.id),
    idTituloEmpresa: idTituloEmpresaDe(parcela.id),
    valor: integral,
  };

  const desconto = r2(integral - pago);
  if (desconto > 0) {
    payload.tipoDesconto = "VALOR";
    payload.valorDesconto1 = desconto;
    payload.dataDesconto1 = parcela.data_vencimento;
  }

  if (config.multa_percentual > 0) {
    payload.tipoMulta = "PERCENTUAL";
    payload.multa = r2(config.multa_percentual);
  }
  if (config.juros_mensal_percentual > 0) {
    payload.tipoJuros = "PERCENTUAL";
    payload.tipoJurosPercentual = "MENSAL";
    payload.juros = r2(config.juros_mensal_percentual);
  }

  const mensagens = (extras.mensagens ?? []).map((m) => cortar(m, 80)).filter(Boolean).slice(0, 4);
  if (mensagens.length > 0) payload.mensagens = mensagens;
  const informativos = (extras.informativos ?? []).map((m) => cortar(m, 80)).filter(Boolean).slice(0, 5);
  if (informativos.length > 0) payload.informativos = informativos;

  return { ok: true, payload };
}

// ---------------------------------------------------------------------------
// Resposta do cadastro
// ---------------------------------------------------------------------------
export type RegistroBoleto = {
  nossoNumero: string;
  linhaDigitavel: string;
  codigoBarras: string;
  qrCode: string | null; // Pix copia-e-cola (só no boleto híbrido)
  txid: string | null;
};

// deno-lint-ignore no-explicit-any
export function parseRespostaRegistro(json: any): RegistroBoleto {
  const nossoNumero = json?.nossoNumero;
  const linhaDigitavel = json?.linhaDigitavel ?? json?.["linhaDigitável"];
  if (!nossoNumero || !linhaDigitavel) {
    throw new Error("Resposta do Sicredi sem nosso número/linha digitável.");
  }
  return {
    nossoNumero: String(nossoNumero),
    linhaDigitavel: String(linhaDigitavel),
    codigoBarras: String(json?.codigoBarras ?? ""),
    qrCode: json?.qrCode ? String(json.qrCode) : null,
    txid: json?.txid ? String(json.txid) : null,
  };
}

// ---------------------------------------------------------------------------
// Webhook (recebimento de eventos)
// ---------------------------------------------------------------------------
export type EventoWebhook = {
  agencia: string;
  posto: string;
  beneficiario: string;
  nossoNumero: string;
  movimento: string;
  valorLiquidacao: number;
  dataEvento: string; // YYYY-MM-DD
  idEventoWebhook: string;
  idTituloEmpresa: string | null;
};

const dois = (n: number) => String(n).padStart(2, "0");

/** dataEvento vem como array [ano, mês, dia, hora, min, seg, nano] (ou string ISO). */
// deno-lint-ignore no-explicit-any
export function dataDoEvento(v: any): string {
  if (Array.isArray(v) && v.length >= 3) return `${v[0]}-${dois(v[1])}-${dois(v[2])}`;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  throw new Error("dataEvento em formato inesperado");
}

// deno-lint-ignore no-explicit-any
export function parseWebhook(json: any): EventoWebhook {
  const obrig = ["agencia", "posto", "beneficiario", "nossoNumero", "movimento", "idEventoWebhook"];
  for (const campo of obrig) {
    if (json?.[campo] === undefined || json?.[campo] === null || String(json[campo]) === "") {
      throw new Error(`Campo obrigatório ausente no webhook: ${campo}`);
    }
  }
  const valor = Number(String(json.valorLiquidacao ?? "0").replace(",", "."));
  return {
    agencia: String(json.agencia),
    posto: String(json.posto),
    beneficiario: String(json.beneficiario),
    nossoNumero: String(json.nossoNumero),
    movimento: String(json.movimento),
    valorLiquidacao: Number.isFinite(valor) ? r2(valor) : 0,
    dataEvento: dataDoEvento(json.dataEvento),
    idEventoWebhook: String(json.idEventoWebhook),
    idTituloEmpresa: json.idTituloEmpresa ? String(json.idTituloEmpresa) : null,
  };
}

export const chaveBeneficiario = (agencia: string, posto: string, beneficiario: string) =>
  `${somenteDigitos(agencia)}-${somenteDigitos(posto)}-${somenteDigitos(beneficiario)}`;

export const ehLiquidacao = (movimento: string) => movimento.startsWith("LIQUIDACAO_");
export const ehEstorno = (movimento: string) => movimento.startsWith("ESTORNO_");
export const formaPagamentoDoMovimento = (movimento: string) => (movimento === "LIQUIDACAO_PIX" ? "Pix" : "Boleto");
