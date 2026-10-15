import { escaparHtml, formatarCpf, formatarDataHoraBrasilia, rotuloFormaAssinatura } from "@/lib/assinaturas";

export type AssinaturaEscola = {
  nome: string | null;
  cargo: string | null;
  assinadoEm: string;
  ip: string | null;
  imagem: string | null;
  forma: string | null;
  estilo: string | null;
};

export type Documento = {
  escolaAssinatura: AssinaturaEscola | null;
  escola: string | null;
  titulo: string;
  alunoNome: string | null;
  html: string;
  assinado: boolean;
  assinadoEm: string | null;
  assinanteNome: string | null;
  assinanteDocumento: string | null;
  assinanteIp: string | null;
  hashDocumento: string | null;
  assinaturaImagem: string | null;
  assinaturaForma: string | null;
  assinaturaEstilo: string | null;
  cpfConferido?: boolean | null;
  limitado?: boolean;
  expiraEm?: string | null;
};

export const ESTILO_DOCUMENTO = `
  body { font-family: Georgia, serif; font-size: 14px; line-height: 1.6; max-width: 700px; margin: 24px auto; padding: 0 20px; color: #000; background: #fff; }
  img { max-width: 100%; }
  .registro { margin-top: 14px; padding-top: 10px; border-top: 1px solid #000; font-size: 12px; page-break-inside: avoid; overflow: hidden; }
  .registro h2 { font-size: 14px; margin: 0 0 8px; }
  .registro dt { float: left; clear: left; width: 150px; font-weight: bold; }
  .registro dd { margin: 0 0 3px 160px; word-break: break-all; }
  .registro img.assinatura { height: 80px; border: 1px solid #999; padding: 2px; margin-bottom: 8px; }
`;

const imagemPng = (src: string | null) =>
  src?.startsWith("data:image/png;base64,") ? `<img class="assinatura" alt="Assinatura" src="${src}" />` : "";

const blocoRegistro = (titulo: string, imagem: string | null, linhas: [string, string][]) =>
  `<div class="registro"><h2>${escaparHtml(titulo)}</h2>${imagemPng(imagem)}<dl>${linhas
    .map(([k, v]) => `<dt>${escaparHtml(k)}</dt><dd>${escaparHtml(v)}</dd>`)
    .join("")}</dl></div>`;

export function montarDocumento(d: Documento): string {
  let registro = "";
  if (d.escolaAssinatura) {
    const e = d.escolaAssinatura;
    const linhas: [string, string][] = [
      ["Assinado por", `${e.nome ?? ""}${e.cargo ? ` (${e.cargo})` : ""}`],
      ["Data e hora", `${formatarDataHoraBrasilia(e.assinadoEm)} (Brasília)`],
    ];
    if (e.ip) linhas.push(["Endereço IP", e.ip]);
    const formaEscola = rotuloFormaAssinatura(e.forma, e.estilo);
    if (formaEscola) linhas.push(["Forma da assinatura", formaEscola]);
    registro += blocoRegistro(`Assinatura da escola${d.escola ? ` — ${d.escola}` : ""}`, e.imagem, linhas);
  }
  if (d.assinado && d.assinadoEm) {
    const linhas: [string, string][] = [
      ["Assinado por", d.assinanteNome ?? ""],
      ["CPF", formatarCpf(d.assinanteDocumento)],
      ["Data e hora", `${formatarDataHoraBrasilia(d.assinadoEm)} (Brasília)`],
    ];
    if (d.assinanteIp) linhas.push(["Endereço IP", d.assinanteIp]);
    if (d.cpfConferido != null) {
      linhas.push(["CPF conferido", d.cpfConferido ? "Sim, com o CPF do responsável cadastrado na escola" : "Não (o cadastro da escola não tinha CPF para conferir)"]);
    }
    const formaFamilia = rotuloFormaAssinatura(d.assinaturaForma, d.assinaturaEstilo);
    if (formaFamilia) linhas.push(["Forma da assinatura", formaFamilia]);
    registro += blocoRegistro("Assinatura do contratante", d.assinaturaImagem, linhas);
  }
  if (registro) {
    registro = `<div class="registros"><h1 style="font-size:15px;margin:36px 0 0">Registro das assinaturas eletrônicas</h1>${registro}${
      d.hashDocumento ? `<div class="registro"><dl><dt>Impressão digital</dt><dd>${escaparHtml(d.hashDocumento)}</dd></dl></div>` : ""
    }<p style="font-size:12px">Assinaturas eletrônicas simples (Lei nº 14.063/2020). A impressão digital identifica o texto exato apresentado para assinatura.</p></div>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><style>${ESTILO_DOCUMENTO}</style></head><body>${d.html}${registro}</body></html>`;
}

