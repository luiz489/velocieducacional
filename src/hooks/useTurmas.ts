import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

export type TurmaRow = {
  id: string;
  nome: string;
  ano_letivo: number;
  turno: string;
  sala: string | null;
  vagas_totais: number;
  alunos_matriculados: number;
  categoria_id: string | null;
  categoria_nome: string | null;
  professor_regente_id: string | null;
  professor_regente_nome: string | null;
};

export function useTurmas() {
  const { escolaAtivaId } = useEscolaAtiva();
  const [turmas, setTurmas] = useState<TurmaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTurmas = useCallback(async () => {
    if (!escolaAtivaId) { setTurmas([]); setLoading(false); return; }
    const { data: turmasData, error } = await supabase
      .from("turmas")
      .select("id, nome, ano_letivo, turno, sala, vagas_totais, categoria_id, professor_regente_id, categorias(nome), professores(nome)")
      .eq("escola_id", escolaAtivaId)
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar turmas: " + error.message);
      setLoading(false);
      return;
    }

    const { data: matriculasData } = await supabase
      .from("matriculas")
      .select("turma_id")
      .eq("escola_id", escolaAtivaId);
    const contagem = new Map<string, number>();
    (matriculasData ?? []).forEach((m) => {
      contagem.set(m.turma_id, (contagem.get(m.turma_id) ?? 0) + 1);
    });

    setTurmas(
      (turmasData ?? []).map((t: any) => ({
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
      }))
    );
    setLoading(false);
  }, [escolaAtivaId]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const createTurma = async (escolaId: string, turma: {
    nome: string; ano_letivo: number; turno: string; sala?: string | null; vagas_totais: number;
    categoria_id?: string | null; professor_regente_id?: string | null;
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
