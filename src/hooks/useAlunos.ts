import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { validarCPF } from "@/lib/validations";

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
    // Validação client-side de CPF duplicado
    const { data: existente } = await supabase
      .from("alunos")
      .select("id, nome")
      .eq("cpf", aluno.cpf)
      .maybeSingle();
    if (existente) {
      toast.error(`CPF já cadastrado para o aluno "${existente.nome}".`);
      return false;
    }
    const { error } = await supabase.from("alunos").insert(aluno);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("alunos_cpf_unique")) {
        toast.error("CPF já cadastrado no sistema.");
      } else {
        toast.error("Erro ao cadastrar aluno: " + error.message);
      }
      return false;
    }
    toast.success("Aluno cadastrado com sucesso!");
    await fetchAlunos();
    return true;
  };

  const updateAluno = async (id: string, updates: TablesUpdate<"alunos">) => {
    if (updates.cpf) {
      const { data: existente } = await supabase
        .from("alunos")
        .select("id, nome")
        .eq("cpf", updates.cpf)
        .neq("id", id)
        .maybeSingle();
      if (existente) {
        toast.error(`CPF já cadastrado para o aluno "${existente.nome}".`);
        return false;
      }
    }
    const { error } = await supabase.from("alunos").update(updates).eq("id", id);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("alunos_cpf_unique")) {
        toast.error("CPF já cadastrado no sistema.");
      } else {
        toast.error("Erro ao atualizar aluno: " + error.message);
      }
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
    // Validação client-side de matrícula duplicada (mesmo aluno + mesma turma/período)
    const { data: existente } = await supabase
      .from("matriculas")
      .select("id, turmas(nome, ano_letivo)")
      .eq("aluno_id", alunoId)
      .eq("turma_id", turmaId)
      .maybeSingle();
    if (existente) {
      const t = (existente as any).turmas;
      toast.error(
        t
          ? `Aluno já matriculado na turma "${t.nome}" (${t.ano_letivo}).`
          : "Aluno já matriculado nesta turma."
      );
      return false;
    }
    const { error } = await supabase.from("matriculas").insert({
      aluno_id: alunoId,
      turma_id: turmaId,
    });
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("matriculas_aluno_turma_unique")) {
        toast.error("Este aluno já está matriculado nesta turma e período.");
      } else {
        toast.error("Erro ao matricular: " + error.message);
      }
      return false;
    }
    toast.success("Matrícula realizada com sucesso!");
    return true;
  };

  return { alunos, turmas, loading, createAluno, updateAluno, inativarAluno, matricularAluno, refetch: fetchAlunos };
}
