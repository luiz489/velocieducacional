// Importação de extrato bancário (OFX/CSV) pra Contas Bancárias.
// Roda 100% no navegador - o arquivo nunca sai do cliente antes de virar
// linhas de movimentacoes_bancarias.

export type LinhaExtratoImportada = {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // sempre positivo
  natureza: "credito" | "debito";
  referenciaExterna: string; // FITID (OFX) ou chave sintética (CSV) - usado pra evitar duplicidade
};

function parseValorBR(raw: string): number {
  let s = raw.replace(/[R$\s]/g, "");
  const negativo = s.startsWith("-") || s.startsWith("(");
  s = s.replace(/[()−-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return negativo ? -n : n;
}

function parseDataBR(raw: string): string | null {
  const s = raw.trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

// Chave determinística pra linhas sem ID estável (CSV). Duas transações
// genuinamente diferentes com mesma data+valor+descrição vão colidir -
// limitação inerente à falta de ID único no arquivo, sinalizada na tela.
function chaveSintetica(data: string, valor: number, descricao: string): string {
  const base = `${data}|${valor.toFixed(2)}|${descricao.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash * 31 + base.charCodeAt(i)) | 0;
  }
  return `sint-${Math.abs(hash).toString(36)}`;
}

export function parseOFX(texto: string): LinhaExtratoImportada[] {
  const blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];
  const linhas: LinhaExtratoImportada[] = [];

  for (const bloco of blocos) {
    const pegar = (tag: string) => {
      const m = bloco.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
      return m ? m[1].trim() : "";
    };

    const dtRaw = pegar("DTPOSTED");
    const dataMatch = dtRaw.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!dataMatch) continue;
    const data = `${dataMatch[1]}-${dataMatch[2]}-${dataMatch[3]}`;

    const trnamt = parseValorBR(pegar("TRNAMT"));
    if (!trnamt || isNaN(trnamt)) continue;

    const fitid = pegar("FITID");
    const descricao = pegar("MEMO") || pegar("NAME") || "Movimentação importada";

    linhas.push({
      data,
      descricao,
      valor: Math.abs(trnamt),
      natureza: trnamt >= 0 ? "credito" : "debito",
      referenciaExterna: fitid || chaveSintetica(data, Math.abs(trnamt), descricao),
    });
  }

  return linhas;
}

export function parseCSV(texto: string): LinhaExtratoImportada[] {
  const todasLinhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (todasLinhas.length < 2) return [];

  const delimitador = todasLinhas[0].includes(";") ? ";" : ",";
  const cabecalho = todasLinhas[0].split(delimitador).map((h) => h.trim().toLowerCase());

  const idxData = cabecalho.findIndex((h) => h.includes("data"));
  const idxDescricao = cabecalho.findIndex((h) => h.includes("desc") || h.includes("histor"));
  const idxValor = cabecalho.findIndex((h) => h.includes("valor"));

  if (idxData === -1 || idxValor === -1) {
    throw new Error(
      'Não encontrei as colunas "Data" e "Valor" no cabeçalho do CSV. Colunas esperadas: Data, Descrição/Histórico, Valor.'
    );
  }

  const linhas: LinhaExtratoImportada[] = [];

  for (const linhaRaw of todasLinhas.slice(1)) {
    const cols = linhaRaw.split(delimitador).map((c) => c.trim());
    const data = parseDataBR(cols[idxData] ?? "");
    const valorRaw = parseValorBR(cols[idxValor] ?? "");
    if (!data || !valorRaw || isNaN(valorRaw)) continue;

    const descricao = idxDescricao !== -1 ? (cols[idxDescricao] ?? "").trim() : "Movimentação importada";

    linhas.push({
      data,
      descricao: descricao || "Movimentação importada",
      valor: Math.abs(valorRaw),
      natureza: valorRaw >= 0 ? "credito" : "debito",
      referenciaExterna: chaveSintetica(data, Math.abs(valorRaw), descricao),
    });
  }

  return linhas;
}

export function parseArquivoExtrato(nomeArquivo: string, conteudo: string): LinhaExtratoImportada[] {
  if (nomeArquivo.toLowerCase().endsWith(".ofx")) return parseOFX(conteudo);
  if (nomeArquivo.toLowerCase().endsWith(".csv")) return parseCSV(conteudo);
  throw new Error("Formato de arquivo não reconhecido. Envie um arquivo .ofx ou .csv.");
}
