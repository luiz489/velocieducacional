import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AlunoData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  endereco: string;
  responsavel: string;
  telefone_responsavel?: string;
  email_responsavel?: string;
  turma: string;
  status: string;
}

interface NotaBoletim {
  disciplina: string;
  av1: number | null;
  av2: number | null;
  recuperacao: number | null;
  media: number | null;
  frequencia: number;
  situacao: string;
}

function addHeader(doc: jsPDF, title: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Navy header bar
  doc.setFillColor(26, 54, 93); // --primary navy
  doc.rect(0, 0, pageWidth, 38, "F");

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EduGestão", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão Escolar", 14, 24);

  // Report title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth - 14, 16, { align: "right" });

  // Date
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageWidth - 14, 24, { align: "right" });

  // Accent line
  doc.setFillColor(59, 130, 246); // info blue
  doc.rect(0, 38, pageWidth, 2, "F");

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, pageHeight - 18, pageWidth, 18, "F");
    doc.setDrawColor(220, 225, 230);
    doc.line(0, pageHeight - 18, pageWidth, pageHeight - 18);

    doc.setFontSize(7);
    doc.setTextColor(120, 130, 140);
    doc.text("EduGestão — ERP Escolar • Documento gerado automaticamente", 14, pageHeight - 7);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 10, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text(title, 18, y + 7);
  doc.setTextColor(0, 0, 0);
  return y + 16;
}

function addFieldRow(doc: jsPDF, fields: { label: string; value: string }[], y: number, colWidth?: number): number {
  const startX = 18;
  const width = colWidth || (doc.internal.pageSize.getWidth() - 36) / fields.length;

  fields.forEach((field, i) => {
    const x = startX + i * width;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 120);
    doc.text(field.label, x, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 40, 50);
    doc.text(field.value || "—", x, y + 6);
  });

  return y + 14;
}

export function gerarFichaAluno(aluno: AlunoData) {
  const doc = new jsPDF();
  addHeader(doc, "Ficha do Aluno");

  let y = 50;

  // Personal data
  y = addSectionTitle(doc, "Dados Pessoais", y);
  y = addFieldRow(doc, [
    { label: "Nome Completo", value: aluno.nome },
    { label: "CPF", value: aluno.cpf },
  ], y);
  y = addFieldRow(doc, [
    { label: "Data de Nascimento", value: new Date(aluno.data_nascimento).toLocaleDateString("pt-BR") },
    { label: "Status", value: aluno.status },
  ], y);
  y = addFieldRow(doc, [
    { label: "Endereço", value: aluno.endereco || "Não informado" },
  ], y);

  y += 4;

  // Academic data
  y = addSectionTitle(doc, "Dados Acadêmicos", y);
  y = addFieldRow(doc, [
    { label: "Turma Atual", value: aluno.turma },
    { label: "Ano Letivo", value: "2026" },
  ], y);

  y += 4;

  // Guardian data
  y = addSectionTitle(doc, "Responsável Financeiro", y);
  y = addFieldRow(doc, [
    { label: "Nome", value: aluno.responsavel },
    { label: "Telefone", value: aluno.telefone_responsavel || "Não informado" },
  ], y);
  y = addFieldRow(doc, [
    { label: "E-mail", value: aluno.email_responsavel || "Não informado" },
  ], y);

  y += 8;

  // Financial summary
  y = addSectionTitle(doc, "Situação Financeira", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Mês", "Valor", "Vencimento", "Status"]],
    body: [
      ["Fevereiro/2026", "R$ 850,00", "10/02/2026", "Pago"],
      ["Março/2026", "R$ 850,00", "10/03/2026", "Pago"],
      ["Abril/2026", "R$ 850,00", "10/04/2026", "Pendente"],
      ["Maio/2026", "R$ 850,00", "10/05/2026", "Pendente"],
    ],
    styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      3: {
        fontStyle: "bold",
      },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 3) {
        if (data.cell.raw === "Pago") {
          data.cell.styles.textColor = [34, 139, 34];
        } else if (data.cell.raw === "Atrasado") {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [180, 140, 20];
        }
      }
    },
  });

  // Signature area
  const sigY = doc.internal.pageSize.getHeight() - 50;
  doc.setDrawColor(180, 185, 190);
  doc.line(14, sigY, 95, sigY);
  doc.line(115, sigY, 196, sigY);
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 120);
  doc.text("Assinatura do Responsável", 54, sigY + 5, { align: "center" });
  doc.text("Assinatura da Secretaria", 155, sigY + 5, { align: "center" });

  addFooter(doc);
  doc.save(`ficha_${aluno.nome.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

export function gerarBoletim(aluno: { nome: string; turma: string }, notas: NotaBoletim[]) {
  const doc = new jsPDF();
  addHeader(doc, "Boletim Escolar");

  let y = 50;

  // Student info
  y = addSectionTitle(doc, "Identificação do Aluno", y);
  y = addFieldRow(doc, [
    { label: "Nome do Aluno", value: aluno.nome },
    { label: "Turma", value: aluno.turma },
    { label: "Ano Letivo", value: "2026" },
  ], y);

  y += 4;

  // Grades table
  y = addSectionTitle(doc, "Desempenho Acadêmico", y);

  const tableBody = notas.map((n) => [
    n.disciplina,
    n.av1 !== null ? n.av1.toFixed(1) : "—",
    n.av2 !== null ? n.av2.toFixed(1) : "—",
    n.recuperacao !== null ? n.recuperacao.toFixed(1) : "—",
    n.media !== null ? n.media.toFixed(1) : "—",
    `${n.frequencia.toFixed(0)}%`,
    n.situacao,
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Disciplina", "AV1", "AV2", "Rec.", "Média", "Freq.", "Situação"]],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 3, halign: "center", font: "helvetica" },
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { halign: "left", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.fontStyle = "bold";
        const val = data.cell.raw as string;
        if (val === "Aprovado") data.cell.styles.textColor = [34, 139, 34];
        else if (val === "Reprovado") data.cell.styles.textColor = [220, 38, 38];
        else if (val === "Recuperação") data.cell.styles.textColor = [180, 140, 20];
        else data.cell.styles.textColor = [100, 110, 120];
      }
      // Color media
      if (data.section === "body" && data.column.index === 4) {
        const val = parseFloat(data.cell.raw as string);
        if (!isNaN(val)) {
          data.cell.styles.fontStyle = "bold";
          if (val >= 7) data.cell.styles.textColor = [34, 139, 34];
          else if (val >= 5) data.cell.styles.textColor = [180, 140, 20];
          else data.cell.styles.textColor = [220, 38, 38];
        }
      }
      // Color frequency
      if (data.section === "body" && data.column.index === 5) {
        const val = parseFloat(data.cell.raw as string);
        if (!isNaN(val) && val < 75) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const aprovadas = notas.filter((n) => n.situacao === "Aprovado").length;
  const mediaGeral = notas.filter((n) => n.media !== null).reduce((s, n) => s + (n.media ?? 0), 0) / (notas.filter((n) => n.media !== null).length || 1);
  const freqGeral = notas.reduce((s, n) => s + n.frequencia, 0) / (notas.length || 1);

  let sy = addSectionTitle(doc, "Resumo Geral", finalY);

  // Summary cards
  const cardWidth = (doc.internal.pageSize.getWidth() - 28 - 16) / 3;
  const cards = [
    { label: "Média Geral", value: mediaGeral.toFixed(1), color: mediaGeral >= 7 ? [34, 139, 34] : mediaGeral >= 5 ? [180, 140, 20] : [220, 38, 38] },
    { label: "Frequência Geral", value: `${freqGeral.toFixed(1)}%`, color: freqGeral >= 75 ? [34, 139, 34] : [220, 38, 38] },
    { label: "Disciplinas Aprovadas", value: `${aprovadas}/${notas.length}`, color: [26, 54, 93] },
  ];

  cards.forEach((card, i) => {
    const cx = 14 + i * (cardWidth + 8);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(cx, sy, cardWidth, 24, 3, 3, "F");
    doc.setDrawColor(220, 225, 230);
    doc.roundedRect(cx, sy, cardWidth, 24, 3, 3, "S");

    doc.setFontSize(7);
    doc.setTextColor(100, 110, 120);
    doc.text(card.label, cx + cardWidth / 2, sy + 8, { align: "center" });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, cx + cardWidth / 2, sy + 19, { align: "center" });
  });

  // Signature area
  const sigY = doc.internal.pageSize.getHeight() - 50;
  doc.setDrawColor(180, 185, 190);
  doc.setFont("helvetica", "normal");
  doc.line(14, sigY, 75, sigY);
  doc.line(80, sigY, 140, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 120);
  doc.text("Diretor(a)", 44, sigY + 5, { align: "center" });
  doc.text("Coordenador(a)", 110, sigY + 5, { align: "center" });
  doc.text("Responsável", 170, sigY + 5, { align: "center" });

  addFooter(doc);
  doc.save(`boletim_${aluno.nome.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}
