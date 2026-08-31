import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function useDashboardData(refMonth: number, refYear: number) {
  const { escolaAtivaId } = useEscolaAtiva();
  return useQuery({
    queryKey: ["dashboard-data", refYear, refMonth, escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const mesStr = String(refMonth + 1).padStart(2, "0");
      const startOfMonth = `${refYear}-${mesStr}-01`;
      const endOfMonth = `${refYear}-${mesStr}-31`;

      const [alunosRes, turmasRes, matriculasRes, financeiroRes, ocorrenciasRes] = await Promise.all([
        supabase.from("alunos").select("id, status, data_nascimento").eq("escola_id", escolaAtivaId!),
        supabase.from("turmas").select("id, turno").eq("escola_id", escolaAtivaId!),
        supabase.from("matriculas").select("id, data_ingresso, turma_id, aluno_id, status_pagamento").eq("escola_id", escolaAtivaId!),
        supabase.from("financeiro").select("id, valor, status, data_vencimento, data_pagamento, tipo").eq("escola_id", escolaAtivaId!),
        supabase.from("ocorrencias").select("id, tipo, data_ocorrencia, aluno_id, descricao, created_at").eq("escola_id", escolaAtivaId!),
      ]);

      const alunos = alunosRes.data || [];
      const turmas = turmasRes.data || [];
      const matriculas = matriculasRes.data || [];
      const financeiro = financeiroRes.data || [];
      const ocorrencias = ocorrenciasRes.data || [];

      const totalAlunos = alunos.filter(a => a.status === "Ativo").length;
      const totalTurmas = turmas.length;
      const matriculasEsteMes = matriculas.filter(m => m.data_ingresso >= startOfMonth && m.data_ingresso <= endOfMonth).length;

      const aniversariantes = alunos.filter(a => {
        const mes = a.data_nascimento?.split("-")[1];
        return mes === mesStr;
      }).length;

      const financeiroMes = financeiro.filter(f => f.data_vencimento >= startOfMonth && f.data_vencimento <= endOfMonth);
      const totalPrevisto = financeiroMes.reduce((s, f) => s + Number(f.valor), 0);
      const recebido = financeiroMes.filter(f => f.status === "Pago").reduce((s, f) => s + Number(f.valor), 0);
      const aReceber = financeiroMes.filter(f => f.status === "Pendente" && f.data_vencimento >= today).reduce((s, f) => s + Number(f.valor), 0);
      const emAtraso = financeiroMes.filter(f => f.status === "Pendente" && f.data_vencimento < today).reduce((s, f) => s + Number(f.valor), 0);
      const inadimplencia = totalPrevisto > 0 ? (emAtraso / totalPrevisto) * 100 : 0;

      const turmaMap = new Map(turmas.map(t => [t.id, t.turno]));
      const turnoCount: Record<string, number> = {};
      matriculas.forEach(m => {
        const turno = turmaMap.get(m.turma_id) || "Outro";
        turnoCount[turno] = (turnoCount[turno] || 0) + 1;
      });
      const alunosPorTurno = Object.entries(turnoCount).map(([name, value]) => ({ name, value }));

      const matriculasMensais = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(refYear, refMonth - i, 1);
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const count = matriculas.filter(m => m.data_ingresso.startsWith(mesKey)).length;
        matriculasMensais.push({ mes: MESES[d.getMonth()], matriculas: count });
      }

      const receitaMensal = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(refYear, refMonth - i, 1);
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const mesFinanceiro = financeiro.filter(f => f.data_vencimento.startsWith(mesKey));
        const previsto = mesFinanceiro.reduce((s, f) => s + Number(f.valor), 0);
        const rec = mesFinanceiro.filter(f => f.status === "Pago").reduce((s, f) => s + Number(f.valor), 0);
        receitaMensal.push({ mes: MESES[d.getMonth()], recebido: rec, previsto });
      }

      const inadimplenciaData = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(refYear, refMonth - i, 1);
        const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const mesEnd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-31`;
        const mesFinanceiro = financeiro.filter(f => f.data_vencimento.startsWith(mesKey));
        const total = mesFinanceiro.reduce((s, f) => s + Number(f.valor), 0);
        const atrasado = mesFinanceiro.filter(f => f.status === "Pendente" && f.data_vencimento < (i === 0 ? today : mesEnd)).reduce((s, f) => s + Number(f.valor), 0);
        const taxa = total > 0 ? Number(((atrasado / total) * 100).toFixed(1)) : 0;
        inadimplenciaData.push({ mes: MESES[d.getMonth()], taxa });
      }

      const ocorrenciaTipoCount: Record<string, number> = {};
      ocorrencias.forEach(o => {
        ocorrenciaTipoCount[o.tipo] = (ocorrenciaTipoCount[o.tipo] || 0) + 1;
      });
      const ocorrenciasTipo = Object.entries(ocorrenciaTipoCount).map(([tipo, quantidade]) => ({ tipo, quantidade }));

      const turnosDistintos = new Set(turmas.map(t => t.turno)).size;

      return {
        kpis: { totalAlunos, totalTurmas, turnosDistintos, inadimplencia, recebido, matriculasEsteMes, aniversariantes },
        receitaMensal,
        alunosPorTurno,
        matriculasMensais,
        inadimplenciaData,
        ocorrenciasTipo,
        resumoFinanceiro: { recebido, aReceber, emAtraso, totalPrevisto },
      };
    },
  });
}
