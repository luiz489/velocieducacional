import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEscolaAtiva } from "@/contexts/EscolaContext";
import { turmasQueryKey } from "@/hooks/useTurmas";

export type MatriculaResumo = {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  turma_id: string;
  turma_nome: string;
  turno: string;
  ano_letivo: number;
  data_ingresso: string;
  status_pagamento: string;
  percentual_desconto: number | null;
  bolsa_100: boolean;
  parcelas_geradas: number;
  parcelas_pagas: number;
  valor_mensal: number | null;
};

export type TurmaComVagas = {
  id: string;
  nome: string;
  turno: string;
  ano_letivo: number;
  vagas_totais: number;
  vagas_ocupadas: number;
};

export function useMatriculas() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();
  const [matriculas, setMatriculas] = useState<MatriculaResumo[]>([]);
  const [loadingMatriculas, setLoadingMatriculas] = useState(true);

  const fetchMatriculas = useCallback(async () => {
    if (!escolaAtivaId) { setMatriculas([]); return; }
    const { data, error } = await supabase
      .from("matriculas")
      .select(`
        id, aluno_id, turma_id, data_ingresso, status_pagamento, percentual_desconto, bolsa_100,
        alunos ( nome ),
        turmas ( nome, turno, ano_letivo ),
        financeiro ( status, valor )
      `)
      .eq("escola_id", escolaAtivaId)
      .order("data_ingresso", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar matrículas: " + error.message);
      setLoadingMatriculas(false);
      return;
    }

    const resumo: MatriculaResumo[] = (data ?? []).map((m: any) => {
      const parcelas = m.financeiro ?? [];
      return {
        id: m.id,
        aluno_id: m.aluno_id,
        aluno_nome: m.alunos?.nome ?? "—",
        turma_id: m.turma_id,
        turma_nome: m.turmas?.nome ?? "—",
        turno: m.turmas?.turno ?? "",
        ano_letivo: m.turmas?.ano_letivo ?? 0,
        data_ingresso: m.data_ingresso,
        status_pagamento: m.status_pagamento,
        percentual_desconto: m.percentual_desconto,
        bolsa_100: m.bolsa_100,
        parcelas_geradas: parcelas.length,
        parcelas_pagas: parcelas.filter((p: any) => p.status === "Pago").length,
        valor_mensal: parcelas[0]?.valor ?? null,
      };
    });

    setMatriculas(resumo);
  }, [escolaAtivaId]);

  useEffect(() => {
    fetchMatriculas().finally(() => setLoadingMatriculas(false));
  }, [fetchMatriculas]);

  // Turmas com vagas: usa a MESMA chave de cache que a tela de Turmas (useTurmas.ts).
  // Assim, criar uma turma nova em qualquer lugar do app já atualiza essa lista aqui também.
  const { data: turmasBase = [], isLoading: loadingTurmas } = useQuery({
    queryKey: turmasQueryKey(escolaAtivaId),
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data: turmasData, error } = await supabase
        .from("turmas")
        .select("id, nome, ano_letivo, turno, sala, vagas_totais, categoria_id, professor_regente_id, categorias(nome), professores(nome)")
        .eq("escola_id", escolaAtivaId!)
        .order("nome");
      if (error) throw error;

      const { data: matriculasData } = await supabase
        .from("matriculas")
        .select("turma_id")
        .eq("escola_id", escolaAtivaId!);
      const contagem = new Map<string, number>();
      (matriculasData ?? []).forEach((m) => {
        contagem.set(m.turma_id, (contagem.get(m.turma_id) ?? 0) + 1);
      });

      return (turmasData ?? []).map((t: any) => ({
        id: t.id,
        nome: t.nome,
        ano_letivo: t.ano_letivo,
        turno: t.turno,
        sala: t.sala,
        vagas_totais: t.vagas_totais,
        categoria_id: t.categoria_id,
        categoria_nome: t.categorias?.nome ?? null,
        professor_regente_id: t.professor_regente_id,
        professor_regente_nome: t.professores?.nome ?? null,
        alunos_matriculados: contagem.get(t.id) ?? 0,
      }));
    },
  });

  const turmasComVagas: TurmaComVagas[] = turmasBase.map((t: any) => ({
    id: t.id,
    nome: t.nome,
    turno: t.turno,
    ano_letivo: t.ano_letivo,
    vagas_totais: t.vagas_totais,
    vagas_ocupadas: t.alunos_matriculados,
  }));

  const loading = loadingMatriculas || loadingTurmas;

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchMatriculas(),
      qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) }),
    ]);
  }, [fetchMatriculas, qc, escolaAtivaId]);

  return { matriculas, turmasComVagas, loading, refetch };
}
