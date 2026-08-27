import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TurmaRow = {
  id: string;
  nome: string;
  ano_letivo: number;
  turno: string;
  sala: string | null;
  vagas_totais: number;
  alunos_matriculados: number;
};

export function useTurmas() {
  const [turmas, setTurmas] = useState<TurmaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTurmas = useCallback(async () => {
    const { data: turmasData, error } = await supabase
      .from("turmas")
      .select("id, nome, ano_letivo, turno, sala, vagas_totais")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar turmas: " + error.message);
      setLoading(false);
      return;
    }

    const { data: matriculasData } = await supabase.from("matriculas").select("turma_id");
    const contagem = new Map<string, number>();
    (matriculasData ?? []).forEach((m) => {
      contagem.set(m.turma_id, (contagem.get(m.turma_id) ?? 0) + 1);
    });

    setTurmas(
      (turmasData ?? []).map((t) => ({
        ...t,
        alunos_matriculados: contagem.get(t.id) ?? 0,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const createTurma = async (escolaId: string, turma: {
    nome: string; ano_letivo: number; turno: string; sala?: string | null; vagas_totais: number;
  }) => {
    const { error } = await supabase.from("turmas").insert({ ...turma, escola_id: escolaId });
    if (error) {
      toast.error("Erro ao cadastrar turma: " + error.message);
      return false;
    }
    toast.success("Turma cadastrada com sucesso!");
    await fetchTurmas();
    return true;
  };

  return { turmas, loading, createTurma, refetch: fetchTurmas };
}
