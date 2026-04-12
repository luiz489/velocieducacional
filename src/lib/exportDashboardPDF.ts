import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const MESES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface DashboardExportData {
  refMonth: number;
  refYear: number;
  kpis: {
    totalAlunos: number;
    totalTurmas: number;
    turnosDistintos: number;
    inadimplencia: number;
    recebido: number;
    matriculasEsteMes: number;
    aniversariantes: number;
  };
  receitaMensal: { mes: string; recebido: number; previsto: number }[];
  alunosPorTurno: { name: string; value: number }[];
  matriculasMensais: { mes: string; matriculas: number }[];
  inadimplenciaData: { mes: string; taxa: number }[];
  ocorrenciasTipo: { tipo: string; quantidade: number }[];
  resumoFinanceiro: { recebido: number; aReceber: number; emAtraso: number; totalPrevisto: number };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function addHeader(doc: jsPDF, periodo: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, pw, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EduGestão", 14, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão Escolar", 14, 24);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório do Dashboard", pw - 14, 12, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(periodo, pw - 14, 20, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pw - 14, 28, { align: "right" });

  doc.setFillColor(59, 130, 246);
  doc.rect(0, 38, pw, 2, "F");
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, ph - 18, pw, 18, "F");
    doc.setDrawColor(220, 225, 230);
    doc.line(0, ph - 18, pw, ph - 18);
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 140);
    doc.text("EduGestão — ERP Escolar • Documento gerado automaticamente", 14, ph - 7);
    doc.text(`Página ${i} de ${total}`, pw - 14, ph - 7, { align: "right" });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(14, y, pw - 28, 10, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text(title, 18, y + 7);
  doc.setTextColor(0, 0, 0);
  return y + 16;
}

function drawKpiCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string) {
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(x, y, w, 22, 3, 3, "F");
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(x, y, w, 22, 3, 3, "S");

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text(label, x + w / 2, y + 8, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text(value, x + w / 2, y + 18, { align: "center" });
}

export function exportarDashboardPDF(d: DashboardExportData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const periodo = `${MESES_FULL[d.refMonth]} ${d.refYear}`;
  addHeader(doc, periodo);

  let y = 48;

  // KPIs
  y = addSectionTitle(doc, "Indicadores Principais", y);
  const cardW = (pw - 28 - 16) / 3;
  const kpiCards = [
    { label: "Total de Alunos", value: String(d.kpis.totalAlunos) },
    { label: "Turmas Ativas", value: String(d.kpis.totalTurmas) },
    { label: "Inadimplência", value: `${d.kpis.inadimplencia.toFixed(1)}%` },
    { label: "Receita Recebida", value: fmt(d.kpis.recebido) },
    { label: "Matrículas Novas", value: String(d.kpis.matriculasEsteMes) },
    { label: "Aniversariantes", value: String(d.kpis.aniversariantes) },
  ];
  kpiCards.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawKpiCard(doc, 14 + col * (cardW + 8), y + row * 28, cardW, card.label, card.value);
  });
  y += 62;

  // Receita mensal table
  y = addSectionTitle(doc, "Receita Mensal (Últimos 6 meses)", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Mês", "Previsto", "Recebido"]],
    body: d.receitaMensal.map(r => [r.mes, fmt(r.previsto), fmt(r.recebido)]),
    styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Alunos por turno table
  if (d.alunosPorTurno.length > 0) {
    y = addSectionTitle(doc, "Alunos por Turno", y);
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Turno", "Quantidade"]],
      body: d.alunosPorTurno.map(t => [t.name, String(t.value)]),
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check page break
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // Matrículas mensais
  y = addSectionTitle(doc, "Matrículas por Mês", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Mês", "Matrículas"]],
    body: d.matriculasMensais.map(m => [m.mes, String(m.matriculas)]),
    styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Inadimplência
  y = addSectionTitle(doc, "Evolução da Inadimplência", y);
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [["Mês", "Taxa (%)"]],
    body: d.inadimplenciaData.map(i => [i.mes, `${i.taxa}%`]),
    styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
    headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const val = parseFloat(data.cell.raw as string);
        if (!isNaN(val) && val > 10) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 220) { doc.addPage(); y = 20; }

  // Ocorrências
  if (d.ocorrenciasTipo.length > 0) {
    y = addSectionTitle(doc, "Ocorrências por Tipo", y);
    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Tipo", "Quantidade"]],
      body: d.ocorrenciasTipo.map(o => [o.tipo, String(o.quantidade)]),
      styles: { fontSize: 8, cellPadding: 3, font: "helvetica" },
      headStyles: { fillColor: [26, 54, 93], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Resumo financeiro
  y = addSectionTitle(doc, "Resumo Financeiro", y);
  const rfCardW = (pw - 28 - 24) / 4;
  const rfCards = [
    { label: "Recebido", value: fmt(d.resumoFinanceiro.recebido), color: [34, 139, 34] },
    { label: "A Receber", value: fmt(d.resumoFinanceiro.aReceber), color: [180, 140, 20] },
    { label: "Em Atraso", value: fmt(d.resumoFinanceiro.emAtraso), color: [220, 38, 38] },
    { label: "Total Previsto", value: fmt(d.resumoFinanceiro.totalPrevisto), color: [26, 54, 93] },
  ];
  rfCards.forEach((card, i) => {
    const cx = 14 + i * (rfCardW + 8);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(cx, y, rfCardW, 24, 3, 3, "F");
    doc.setDrawColor(220, 225, 230);
    doc.roundedRect(cx, y, rfCardW, 24, 3, 3, "S");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 120);
    doc.text(card.label, cx + rfCardW / 2, y + 8, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.text(card.value, cx + rfCardW / 2, y + 19, { align: "center" });
  });

  addFooter(doc);
  doc.save(`dashboard_${MESES_FULL[d.refMonth].toLowerCase()}_${d.refYear}.pdf`);
}
