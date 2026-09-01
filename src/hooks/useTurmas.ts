import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// Chave compartilhada com useMatriculas.ts - criar/editar uma turma aqui
// atualiza automaticamente a lista de turmas na tela de Nova Matrícula também.
export const turmasQueryKey = (escolaId: string | null) => ["turmas-lista", escolaId];

export function useTurmas() {
  const { escolaAtivaId } = useEscolaAtiva();
  const qc = useQueryClient();

  const { data: turmas = [], isLoading: loading } = useQuery({
    queryKey: turmasQueryKey(escolaAtivaId),
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data: turmasData, error } = await supabase
        .from("turmas")
        .select("id, nome, ano_letivo, turno, sala, vagas_totais, categoria_id, professor_regente_id, categorias(nome), professores(nome)")
        .eq("escola_id", escolaAtivaId!)
        .order("nome");

      if (error) {
        toast.error("Erro ao carregar turmas: " + error.message);
        throw error;
      }

      const { data: matriculasData } = await supabase
        .from("matriculas")
        .select("turma_id")
        .eq("escola_id", escolaAtivaId!);
      const contagem = new Map<string, number>();
      (matriculasData ?? []).forEach((m) => {
        contagem.set(m.turma_id, (contagem.get(m.turma_id) ?? 0) + 1);
      });

      return (turmasData ?? []).map((t: any): TurmaRow => ({
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
    await qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) });
    return true;
  };

  const updateTurma = async (id: string, turma: {
    nome: string; ano_letivo: number; turno: string; sala?: string | null; vagas_totais: number;
    categoria_id?: string | null; professor_regente_id?: string | null;
  }) => {
    const { error } = await supabase.from("turmas").update(turma).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar turma: " + error.message);
      return false;
    }
    toast.success("Turma atualizada com sucesso!");
    await qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) });
    return true;
  };

  const deleteTurma = async (id: string) => {
    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        toast.error("Não é possível excluir: existem alunos matriculados nesta turma.");
      } else {
        toast.error("Erro ao excluir turma: " + error.message);
      }
      return false;
    }
    toast.success("Turma excluída com sucesso!");
    await qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) });
    return true;
  };

  const refetch = async () => {
    await qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) });
  };

  return { turmas, loading, createTurma, updateTurma, deleteTurma, refetch };
}
