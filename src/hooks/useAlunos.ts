import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Aluno = Tables<"alunos">;
export type Turma = Tables<"turmas">;

export function useAlunos() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlunos = useCallback(async () => {
    const { data, error } = await supabase
      .from("alunos")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar alunos: " + error.message);
    } else {
      setAlunos(data || []);
    }
  }, []);

  const fetchTurmas = useCallback(async () => {
    const { data, error } = await supabase
      .from("turmas")
      .select("*")
      .order("nome");
    if (!error) setTurmas(data || []);
  }, []);

  useEffect(() => {
    Promise.all([fetchAlunos(), fetchTurmas()]).finally(() => setLoading(false));
  }, [fetchAlunos, fetchTurmas]);

  const createAluno = async (aluno: TablesInsert<"alunos">) => {
    const { error } = await supabase.from("alunos").insert(aluno);
    if (error) {
      toast.error("Erro ao cadastrar aluno: " + error.message);
      return false;
    }
    toast.success("Aluno cadastrado com sucesso!");
    await fetchAlunos();
    return true;
  };

  const updateAluno = async (id: string, updates: TablesUpdate<"alunos">) => {
    const { error } = await supabase.from("alunos").update(updates).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar aluno: " + error.message);
      return false;
    }
    toast.success("Aluno atualizado com sucesso!");
    await fetchAlunos();
    return true;
  };

  const inativarAluno = async (id: string) => {
    return updateAluno(id, { status: "Inativo" });
  };

  const matricularAluno = async (alunoId: string, turmaId: string) => {
    const { error } = await supabase.from("matriculas").insert({
      aluno_id: alunoId,
      turma_id: turmaId,
    });
    if (error) {
      toast.error("Erro ao matricular: " + error.message);
      return false;
    }
    toast.success("Matrícula realizada com sucesso!");
    return true;
  };

  return { alunos, turmas, loading, createAluno, updateAluno, inativarAluno, matricularAluno, refetch: fetchAlunos };
}
