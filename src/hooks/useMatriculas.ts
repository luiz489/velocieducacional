import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [matriculas, setMatriculas] = useState<MatriculaResumo[]>([]);
  const [turmasComVagas, setTurmasComVagas] = useState<TurmaComVagas[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatriculas = useCallback(async () => {
    const { data, error } = await supabase
      .from("matriculas")
      .select(`
        id, aluno_id, turma_id, data_ingresso, status_pagamento, percentual_desconto, bolsa_100,
        alunos ( nome ),
        turmas ( nome, turno, ano_letivo ),
        financeiro ( status, valor )
      `)
      .order("data_ingresso", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar matrículas: " + error.message);
      setLoading(false);
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
  }, []);

  const fetchTurmasComVagas = useCallback(async () => {
    const { data: turmas, error } = await supabase
      .from("turmas")
      .select("id, nome, turno, ano_letivo, vagas_totais")
      .order("nome");
    if (error || !turmas) return;

    const { data: contagem } = await supabase
      .from("matriculas")
      .select("turma_id");

    const ocupadas = new Map<string, number>();
    (contagem ?? []).forEach((m: any) => {
      ocupadas.set(m.turma_id, (ocupadas.get(m.turma_id) ?? 0) + 1);
    });

    setTurmasComVagas(
      turmas.map((t) => ({
        ...t,
        vagas_ocupadas: ocupadas.get(t.id) ?? 0,
      }))
    );
  }, []);

  useEffect(() => {
    Promise.all([fetchMatriculas(), fetchTurmasComVagas()]).finally(() => setLoading(false));
  }, [fetchMatriculas, fetchTurmasComVagas]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchMatriculas(), fetchTurmasComVagas()]);
  }, [fetchMatriculas, fetchTurmasComVagas]);

  return { matriculas, turmasComVagas, loading, refetch };
}
