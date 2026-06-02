import jsPDF from "jspdf";

export type CarneParcela = {
  id: string;
  descricao: string;
  vencimento: string; // dd/mm/yyyy
  valor: number;
};

export type CarneAluno = {
  nome: string;
  turma: string;
  responsavel: string;
  matricula?: string;
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function gerarCarnePDF(aluno: CarneAluno, parcelas: CarneParcela[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  const boletoH = 85;
  let y = margin;

  // Capa
  doc.setFillColor(234, 88, 12); // primary orange
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EduGestão · Carnê de Pagamento", margin, 18);
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

  // Boletos
  parcelas.forEach((p, idx) => {
    if (y + boletoH > 285) {
      doc.addPage();
      y = margin;
    }
    drawBoleto(doc, margin, y, pageW - margin * 2, boletoH, p, aluno, idx + 1, parcelas.length);
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
) {
  // Border
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2);

  // Header strip
  doc.setFillColor(248, 240, 230);
  doc.roundedRect(x, y, w, 10, 2, 2, "F");
  doc.setTextColor(120, 60, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Parcela ${num}/${total}`, x + 3, y + 6.5);
  doc.text("EduGestão", x + w - 3, y + 6.5, { align: "right" });

  doc.setTextColor(20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const colX = x + 3;
  let ly = y + 16;

  doc.setFont("helvetica", "bold");
  doc.text("Aluno", colX, ly);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.nome, colX + 18, ly);

  doc.setFont("helvetica", "bold");
  doc.text("Turma", colX + 110, ly);
  doc.setFont("helvetica", "normal");
  doc.text(aluno.turma, colX + 125, ly);
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

  doc.setFont("helvetica", "bold");
  doc.text("Valor", colX + 110, ly);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(234, 88, 12);
  doc.text(brl(p.valor), colX + 125, ly);
  doc.setTextColor(20);
  doc.setFontSize(8);
  ly += 8;

  // Linha digitável (mock)
  doc.setFont("helvetica", "bold");
  doc.text("Linha digitável", colX, ly);
  ly += 4;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const linha = `34191.79001 01043.51004${num} 91020.150008 9 ${String(95820000000 + Math.round(p.valor * 100)).slice(-12)}`;
  doc.text(linha, colX, ly);

  // Pix box
  const pixX = x + w - 42;
  const pixY = y + 14;
  doc.setDrawColor(234, 88, 12);
  doc.roundedRect(pixX, pixY, 38, 38, 1.5, 1.5);
  // Fake QR pattern
  doc.setFillColor(20, 20, 20);
  const cells = 8;
  const cs = 38 / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      if ((i * 7 + j * 3 + num) % 3 === 0) {
        doc.rect(pixX + j * cs + 1, pixY + i * cs + 1, cs - 1, cs - 1, "F");
      }
    }
  }
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(234, 88, 12);
  doc.text("Pix", pixX + 19, pixY + 44, { align: "center" } as any);
  doc.setTextColor(20);

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text(
    "Após o vencimento sujeito a multa de 2% e juros de 1% a.m. · Pagável em qualquer banco.",
    x + 3,
    y + h - 3,
  );
  doc.setTextColor(20);
}
