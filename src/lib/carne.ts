import jsPDF from "jspdf";
import QRCode from "qrcode";

export type CarneParcela = {
  id: string;
  descricao: string;
  vencimento: string; // dd/mm/yyyy
  valor: number; // valor a pagar até o vencimento (com desconto de pontualidade, se houver)
  valorIntegral?: number | null; // valor cheio, cobrado depois do vencimento
  linhaDigitavel?: string | null; // do boleto registrado no banco
  pixCopiaECola?: string | null; // QR Code Pix do boleto híbrido
};

export type CarneAluno = {
  nome: string;
  turma: string;
  responsavel: string;
  matricula?: string;
};

export type CarneOpcoes = {
  escola?: string;
  multaPercentual?: number;
  jurosMensalPercentual?: number;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** 47 dígitos -> AAAAA.AAAAA AAAAA.AAAAAA AAAAA.AAAAAA D FFFFVVVVVVVVVV (o formato que o cliente já conhece). */
export function formatarLinhaDigitavel(linha: string): string {
  const d = (linha ?? "").replace(/\D/g, "");
  if (d.length !== 47) return linha;
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
}

export async function gerarCarnePDF(aluno: CarneAluno, parcelas: CarneParcela[], opcoes: CarneOpcoes = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const boletoH = 85;
  let y = margin;

  // QR Codes de todas as parcelas, gerados antes de desenhar
  const qrs = new Map<string, string>();
  await Promise.all(
    parcelas.map(async (p) => {
      if (p.pixCopiaECola) {
        qrs.set(p.id, await QRCode.toDataURL(p.pixCopiaECola, { margin: 1, width: 320, errorCorrectionLevel: "M" }));
      }
    }),
  );

  // Capa
  doc.setFillColor(234, 88, 12);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${opcoes.escola ?? "Veloci Educacional"} · Carnê de Pagamento`, margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, pageW - margin, 18, { align: "right" });

  doc.setTextColor(20, 20, 20);
  y = 38;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Aluno:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.nome, margin + 18, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Turma:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.turma, margin + 18, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Responsável:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.responsavel, margin + 28, y);
  y += 10;

  parcelas.forEach((p, idx) => {
    if (y + boletoH > 285) {
      doc.addPage();
      y = margin;
    }
    drawBoleto(doc, margin, y, pageW - margin * 2, boletoH, p, aluno, idx + 1, parcelas.length, qrs.get(p.id), opcoes);
    y += boletoH + 4;
  });

  doc.save(`carne-${aluno.nome.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

function drawBoleto(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  p: CarneParcela,
  aluno: CarneAluno,
  num: number,
  total: number,
  qrDataUrl: string | undefined,
  opcoes: CarneOpcoes,
) {
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2);

  doc.setFillColor(248, 240, 230);
  doc.roundedRect(x, y, w, 10, 2, 2, "F");
  doc.setTextColor(120, 60, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Parcela ${num}/${total}`, x + 3, y + 6.5);
  doc.text(opcoes.escola ?? "Veloci Educacional", x + w - 3, y + 6.5, { align: "right" });

  doc.setTextColor(20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const colX = x + 3;
  let ly = y + 16;

  doc.setFont("helvetica", "bold");
  doc.text("Aluno", colX, ly);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.nome, colX + 18, ly);
  ly += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Descrição", colX, ly);
  doc.setFont("helvetica", "normal");
  doc.text(p.descricao, colX + 18, ly);
  ly += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Vencimento", colX, ly);
  doc.setFont("helvetica", "normal");
  doc.text(p.vencimento, colX + 22, ly);
  ly += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Valor", colX, ly);
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  doc.text(brl(p.valor), colX + 22, ly);
  doc.setTextColor(20);
  doc.setFontSize(8);
  if (p.valorIntegral && p.valorIntegral > p.valor) {
    doc.setFont("helvetica", "normal");
    doc.text(`(pagando até o vencimento; depois: ${brl(p.valorIntegral)})`, colX + 50, ly);
  }
  ly += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Linha digitável", colX, ly);
  ly += 4.5;

  if (p.linhaDigitavel) {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text(formatarLinhaDigitavel(p.linhaDigitavel), colX, ly);
  } else {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(180, 40, 40);
    doc.text("Boleto ainda não emitido no banco - procure a secretaria.", colX, ly);
    doc.setTextColor(20);
  }

  // Pix
  const pixX = x + w - 42;
  const pixY = y + 14;
  if (qrDataUrl) {
    doc.setDrawColor(234, 88, 12);
    doc.roundedRect(pixX, pixY, 38, 38, 1.5, 1.5);
    doc.addImage(qrDataUrl, "PNG", pixX + 1, pixY + 1, 36, 36);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 88, 12);
    doc.text("Pague com Pix", pixX + 19, pixY + 42, { align: "center" });
    doc.setTextColor(20);
  }

  // Rodapé: multa/juros só se a escola tiver configurado
  const partes: string[] = [];
  if (opcoes.multaPercentual && opcoes.multaPercentual > 0) partes.push(`multa de ${opcoes.multaPercentual}%`);
  if (opcoes.jurosMensalPercentual && opcoes.jurosMensalPercentual > 0) partes.push(`juros de ${opcoes.jurosMensalPercentual}% a.m.`);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text(
    `${partes.length ? `Após o vencimento: ${partes.join(" + ")}. ` : ""}Pagável em qualquer banco ou pelo Pix.`,
    x + 3,
    y + h - 3,
  );
  doc.setTextColor(20);
}
