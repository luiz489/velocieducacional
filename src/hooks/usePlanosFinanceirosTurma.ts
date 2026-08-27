import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TurmaComPlano = {
  turma_id: string;
  turma_nome: string;
  turno: string;
  ano_letivo: number;
  plano_id: string | null;
  valor_mensalidade: number | null;
  numero_parcelas: number | null;
  dia_vencimento: number | null;
  taxa_matricula: number | null;
};

export function usePlanosFinanceirosTurma() {
  const [turmas, setTurmas] = useState<TurmaComPlano[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDados = useCallback(async () => {
    const { data: turmasData, error } = await supabase
      .from("turmas")
      .select("id, nome, turno, ano_letivo")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar turmas: " + error.message);
      setLoading(false);
      return;
    }

    const { data: planosData } = await supabase
      .from("planos_financeiros_turma")
      .select("id, turma_id, valor_mensalidade, numero_parcelas, dia_vencimento, taxa_matricula");

    const planosPorTurma = new Map((planosData ?? []).map((p) => [p.turma_id, p]));

    setTurmas(
      (turmasData ?? []).map((t) => {
        const plano = planosPorTurma.get(t.id);
        return {
          turma_id: t.id,
          turma_nome: t.nome,
          turno: t.turno,
          ano_letivo: t.ano_letivo,
          plano_id: plano?.id ?? null,
          valor_mensalidade: plano?.valor_mensalidade ?? null,
          numero_parcelas: plano?.numero_parcelas ?? null,
          dia_vencimento: plano?.dia_vencimento ?? null,
          taxa_matricula: plano?.taxa_matricula ?? null,
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  const salvarPlano = async (
    turmaId: string,
    escolaId: string,
    valores: { valor_mensalidade: number; numero_parcelas: number; dia_vencimento: number; taxa_matricula: number }
  ) => {
    const { error } = await supabase
      .from("planos_financeiros_turma")
      .upsert(
        {
          turma_id: turmaId,
          escola_id: escolaId,
          valor_mensalidade: valores.valor_mensalidade,
          numero_parcelas: valores.numero_parcelas,
          dia_vencimento: valores.dia_vencimento,
          taxa_matricula: valores.taxa_matricula,
        },
        { onConflict: "turma_id" }
      );

    if (error) {
      toast.error("Erro ao salvar plano financeiro: " + error.message);
      return false;
    }
    toast.success("Plano financeiro salvo com sucesso!");
    await fetchDados();
    return true;
  };

  return { turmas, loading, salvarPlano, refetch: fetchDados };
}
