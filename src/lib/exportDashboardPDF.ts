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

// ─── Header / Footer / Helpers ──────────────────────────────────────

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

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - 25) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ─── Chart Drawing Functions ────────────────────────────────────────

function drawAreaChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: { mes: string; recebido: number; previsto: number }[]
) {
  if (data.length === 0) return;
  const margin = { left: 30, bottom: 16, top: 8, right: 8 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;
  const cx = x + margin.left;
  const cy = y + margin.top;

  const maxVal = Math.max(...data.flatMap(d => [d.recebido, d.previsto]), 1);
  const step = chartW / Math.max(data.length - 1, 1);

  // Background
  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(230, 233, 238);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  // Grid lines
  doc.setDrawColor(235, 238, 242);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = cy + chartH - (chartH / 4) * i;
    doc.line(cx, gy, cx + chartW, gy);
    const val = (maxVal / 4) * i;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 140, 150);
    doc.text(`${(val / 1000).toFixed(0)}k`, cx - 3, gy + 1.5, { align: "right" });
  }

  // Previsto line (dashed)
  const previstoPoints = data.map((d, i) => ({
    px: cx + i * step,
    py: cy + chartH - (d.previsto / maxVal) * chartH,
  }));
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.8);
  for (let i = 0; i < previstoPoints.length - 1; i++) {
    const a = previstoPoints[i], b = previstoPoints[i + 1];
    // Simulate dash
    const segments = 6;
    for (let s = 0; s < segments; s += 2) {
      const t1 = s / segments, t2 = Math.min((s + 1) / segments, 1);
      doc.line(
        a.px + (b.px - a.px) * t1, a.py + (b.py - a.py) * t1,
        a.px + (b.px - a.px) * t2, a.py + (b.py - a.py) * t2
      );
    }
  }

  // Recebido area fill
  const recebidoPoints = data.map((d, i) => ({
    px: cx + i * step,
    py: cy + chartH - (d.recebido / maxVal) * chartH,
  }));
  // Fill area with semi-transparent rectangles (approximate)
  doc.setFillColor(26, 54, 93);
  doc.setGState(new (doc as any).GState({ opacity: 0.15 }));
  for (let i = 0; i < recebidoPoints.length - 1; i++) {
    const a = recebidoPoints[i], b = recebidoPoints[i + 1];
    const midY = (a.py + b.py) / 2;
    const baseY = cy + chartH;
    doc.triangle(a.px, a.py, b.px, b.py, a.px, baseY, "F");
    doc.triangle(b.px, b.py, b.px, baseY, a.px, baseY, "F");
  }
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  // Recebido line
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(1.2);
  for (let i = 0; i < recebidoPoints.length - 1; i++) {
    doc.line(recebidoPoints[i].px, recebidoPoints[i].py, recebidoPoints[i + 1].px, recebidoPoints[i + 1].py);
  }

  // Dots
  recebidoPoints.forEach(p => {
    doc.setFillColor(26, 54, 93);
    doc.circle(p.px, p.py, 1.5, "F");
  });

  // X labels
  data.forEach((d, i) => {
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 140, 150);
    doc.text(d.mes, cx + i * step, cy + chartH + 10, { align: "center" });
  });

  // Legend
  const legendY = y + 5;
  doc.setFillColor(26, 54, 93);
  doc.rect(x + w - 70, legendY, 6, 3, "F");
  doc.setFontSize(5.5);
  doc.setTextColor(80, 90, 100);
  doc.text("Recebido", x + w - 62, legendY + 3);
  doc.setDrawColor(180, 190, 200);
  doc.setLineWidth(0.6);
  doc.line(x + w - 38, legendY + 1.5, x + w - 32, legendY + 1.5);
  doc.text("Previsto", x + w - 30, legendY + 3);
}

function drawBarChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: { label: string; value: number }[],
  barColor: [number, number, number]
) {
  if (data.length === 0) return;
  const margin = { left: 24, bottom: 16, top: 8, right: 8 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;
  const cx = x + margin.left;
  const cy = y + margin.top;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = (chartW / data.length) * 0.6;
  const gap = chartW / data.length;

  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(230, 233, 238);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  // Grid
  doc.setDrawColor(235, 238, 242);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = cy + chartH - (chartH / 4) * i;
    doc.line(cx, gy, cx + chartW, gy);
    doc.setFontSize(6);
    doc.setTextColor(130, 140, 150);
    const val = (maxVal / 4) * i;
    doc.text(val % 1 === 0 ? String(Math.round(val)) : val.toFixed(1), cx - 3, gy + 1.5, { align: "right" });
  }

  // Bars
  data.forEach((d, i) => {
    const barH = (d.value / maxVal) * chartH;
    const bx = cx + i * gap + (gap - barW) / 2;
    const by = cy + chartH - barH;
    doc.setFillColor(barColor[0], barColor[1], barColor[2]);
    doc.roundedRect(bx, by, barW, barH, 1.5, 1.5, "F");

    // Value on top
    if (d.value > 0) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(barColor[0], barColor[1], barColor[2]);
      doc.text(String(d.value), bx + barW / 2, by - 2, { align: "center" });
    }

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 140, 150);
    doc.text(d.label, bx + barW / 2, cy + chartH + 10, { align: "center" });
  });
}

function drawLineChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: { label: string; value: number }[],
  lineColor: [number, number, number]
) {
  if (data.length === 0) return;
  const margin = { left: 24, bottom: 16, top: 8, right: 8 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;
  const cx = x + margin.left;
  const cy = y + margin.top;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const step = chartW / Math.max(data.length - 1, 1);

  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(230, 233, 238);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  // Grid
  doc.setDrawColor(235, 238, 242);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= 4; i++) {
    const gy = cy + chartH - (chartH / 4) * i;
    doc.line(cx, gy, cx + chartW, gy);
    doc.setFontSize(6);
    doc.setTextColor(130, 140, 150);
    const val = (maxVal / 4) * i;
    doc.text(`${val.toFixed(0)}%`, cx - 3, gy + 1.5, { align: "right" });
  }

  // Line
  const points = data.map((d, i) => ({
    px: cx + i * step,
    py: cy + chartH - (d.value / maxVal) * chartH,
  }));
  doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
  doc.setLineWidth(1.2);
  for (let i = 0; i < points.length - 1; i++) {
    doc.line(points[i].px, points[i].py, points[i + 1].px, points[i + 1].py);
  }

  // Dots + values
  points.forEach((p, i) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.setLineWidth(0.8);
    doc.circle(p.px, p.py, 2, "FD");
    doc.setFillColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.circle(p.px, p.py, 1, "F");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(lineColor[0], lineColor[1], lineColor[2]);
    doc.text(`${data[i].value}%`, p.px, p.py - 4, { align: "center" });

    // X label
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 140, 150);
    doc.text(data[i].label, p.px, cy + chartH + 10, { align: "center" });
  });
}

function drawPieChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: { name: string; value: number }[],
  colors: [number, number, number][]
) {
  if (data.length === 0) return;

  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(230, 233, 238);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  const centerX = x + w * 0.4;
  const centerY = y + h / 2;
  const outerR = Math.min(w * 0.3, h * 0.38);
  const innerR = outerR * 0.55;

  // Draw donut slices using many small triangles
  let startAngle = -Math.PI / 2;
  data.forEach((d, idx) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const color = colors[idx % colors.length];
    doc.setFillColor(color[0], color[1], color[2]);

    const segments = Math.max(Math.ceil(sliceAngle / 0.05), 4);
    const angleStep = sliceAngle / segments;

    for (let s = 0; s < segments; s++) {
      const a1 = startAngle + s * angleStep;
      const a2 = startAngle + (s + 1) * angleStep;

      const ox1 = centerX + Math.cos(a1) * outerR;
      const oy1 = centerY + Math.sin(a1) * outerR;
      const ox2 = centerX + Math.cos(a2) * outerR;
      const oy2 = centerY + Math.sin(a2) * outerR;
      const ix1 = centerX + Math.cos(a1) * innerR;
      const iy1 = centerY + Math.sin(a1) * innerR;
      const ix2 = centerX + Math.cos(a2) * innerR;
      const iy2 = centerY + Math.sin(a2) * innerR;

      // Two triangles to form the segment
      doc.triangle(ox1, oy1, ox2, oy2, ix1, iy1, "F");
      doc.triangle(ox2, oy2, ix2, iy2, ix1, iy1, "F");
    }

    startAngle += sliceAngle;
  });

  // White center circle
  doc.setFillColor(250, 251, 252);
  doc.circle(centerX, centerY, innerR - 0.5, "F");

  // Total in center
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(26, 54, 93);
  doc.text(String(total), centerX, centerY + 1, { align: "center" });
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 140, 150);
  doc.text("total", centerX, centerY + 5, { align: "center" });

  // Legend
  const legendX = x + w * 0.68;
  let legendY = y + h * 0.2;
  data.forEach((d, idx) => {
    const color = colors[idx % colors.length];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(legendX, legendY, 5, 5, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 70, 80);
    const pct = ((d.value / total) * 100).toFixed(0);
    doc.text(`${d.name} (${pct}%)`, legendX + 8, legendY + 4);
    legendY += 10;
  });
}

// ─── Horizontal Bar Chart ───────────────────────────────────────────

function drawHorizontalBarChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  data: { label: string; value: number; color: [number, number, number] }[]
) {
  if (data.length === 0) return;

  doc.setFillColor(250, 251, 252);
  doc.roundedRect(x, y, w, h, 3, 3, "F");
  doc.setDrawColor(230, 233, 238);
  doc.roundedRect(x, y, w, h, 3, 3, "S");

  const margin = { left: 50, right: 20, top: 8, bottom: 8 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;
  const cx = x + margin.left;
  const cy = y + margin.top;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barH = Math.min((chartH / data.length) * 0.6, 10);
  const gap = chartH / data.length;

  data.forEach((d, i) => {
    const barW = (d.value / maxVal) * chartW;
    const by = cy + i * gap + (gap - barH) / 2;

    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.roundedRect(cx, by, Math.max(barW, 2), barH, 1.5, 1.5, "F");

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 70, 80);
    doc.text(d.label, cx - 4, by + barH / 2 + 1.5, { align: "right" });

    // Value
    doc.setFont("helvetica", "bold");
    doc.setTextColor(d.color[0], d.color[1], d.color[2]);
    doc.text(String(d.value), cx + barW + 4, by + barH / 2 + 1.5);
  });
}

// ─── Main Export ────────────────────────────────────────────────────

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

  // ─── Receita Mensal Chart ───────────────────────────────────────
  y = addSectionTitle(doc, "Receita Mensal (Últimos 6 meses)", y);
  drawAreaChart(doc, 14, y, pw - 28, 70, d.receitaMensal);
  y += 78;

  // ─── Receita Table ──────────────────────────────────────────────
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

  // ─── Side by side: Pie + Bar ────────────────────────────────────
  y = ensureSpace(doc, y, 100);

  const halfW = (pw - 28 - 8) / 2;

  // Alunos por Turno (Pie)
  if (d.alunosPorTurno.length > 0) {
    y = addSectionTitle(doc, "Alunos por Turno / Matrículas por Mês", y);

    const pieColors: [number, number, number][] = [
      [26, 54, 93], [66, 133, 244], [180, 195, 215], [217, 161, 35],
    ];
    drawPieChart(doc, 14, y, halfW, 80, d.alunosPorTurno, pieColors);

    drawBarChart(doc, 14 + halfW + 8, y, halfW, 80,
      d.matriculasMensais.map(m => ({ label: m.mes, value: m.matriculas })),
      [66, 133, 244]
    );
    y += 88;
  } else {
    // Just matriculas
    y = addSectionTitle(doc, "Matrículas por Mês", y);
    drawBarChart(doc, 14, y, pw - 28, 70,
      d.matriculasMensais.map(m => ({ label: m.mes, value: m.matriculas })),
      [66, 133, 244]
    );
    y += 78;
  }

  // ─── Inadimplência Chart ────────────────────────────────────────
  y = ensureSpace(doc, y, 90);
  y = addSectionTitle(doc, "Evolução da Inadimplência", y);
  drawLineChart(doc, 14, y, pw - 28, 65,
    d.inadimplenciaData.map(i => ({ label: i.mes, value: i.taxa })),
    [217, 161, 35]
  );
  y += 73;

  // ─── Ocorrências Chart ─────────────────────────────────────────
  if (d.ocorrenciasTipo.length > 0) {
    y = ensureSpace(doc, y, 80);
    y = addSectionTitle(doc, "Ocorrências por Tipo", y);
    const ocColors: Record<string, [number, number, number]> = {
      "Advertência": [220, 38, 38],
      "Elogio": [34, 139, 34],
      "Observação": [217, 161, 35],
    };
    drawHorizontalBarChart(doc, 14, y, pw - 28, Math.max(d.ocorrenciasTipo.length * 18 + 16, 40),
      d.ocorrenciasTipo.map(o => ({
        label: o.tipo,
        value: o.quantidade,
        color: ocColors[o.tipo] || [100, 120, 150],
      }))
    );
    y += Math.max(d.ocorrenciasTipo.length * 18 + 16, 40) + 8;
  }

  // ─── Resumo Financeiro ──────────────────────────────────────────
  y = ensureSpace(doc, y, 40);
  y = addSectionTitle(doc, "Resumo Financeiro", y);
  const rfCardW = (pw - 28 - 24) / 4;
  const rfCards = [
    { label: "Recebido", value: fmt(d.resumoFinanceiro.recebido), color: [34, 139, 34] as [number, number, number] },
    { label: "A Receber", value: fmt(d.resumoFinanceiro.aReceber), color: [180, 140, 20] as [number, number, number] },
    { label: "Em Atraso", value: fmt(d.resumoFinanceiro.emAtraso), color: [220, 38, 38] as [number, number, number] },
    { label: "Total Previsto", value: fmt(d.resumoFinanceiro.totalPrevisto), color: [26, 54, 93] as [number, number, number] },
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
