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
  aluno_status: string;
  turma_id: string;
  turma_nome: string;
  turno: string;
  ano_letivo: number;
  data_ingresso: string;
  data_vencimento_matricula: string | null;
  dia_vencimento_mensalidade: number | null;
  parcelas_taxa_matricula: number;
  datas_taxa_matricula: string[] | null;
  valor_taxa_matricula: number | null;
  valor_mensalidade_negociado: number | null;
  modalidade_financeira_id: string | null;
  status_pagamento: string;
  percentual_desconto: number | null;
  bolsa_100: boolean;
  parcelas_geradas: number;
  parcelas_pagas: number;
  valor_mensal: number | null;
  mensalidade_dividida: boolean;
  dividir_taxa_matricula: boolean;
  responsavel2_nome: string | null;
  responsavel2_cpf: string | null;
  responsavel2_telefone: string | null;
  responsavel2_email: string | null;
  responsavel2_percentual: number;
};

export type TurmaComVagas = {
  id: string;
  nome: string;
  turno: string;
  ano_letivo: number;
  vagas_totais: number;
  vagas_ocupadas: number;
  categoria_id: string | null;
  categoria_nome: string | null;
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
        id, aluno_id, turma_id, data_ingresso, data_vencimento_matricula, dia_vencimento_mensalidade, parcelas_taxa_matricula, datas_taxa_matricula, valor_taxa_matricula, valor_mensalidade_negociado, modalidade_financeira_id, status_pagamento, percentual_desconto, bolsa_100,
        mensalidade_dividida, dividir_taxa_matricula, responsavel2_nome, responsavel2_cpf, responsavel2_telefone, responsavel2_email, responsavel2_percentual,
        alunos ( nome, status ),
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
        aluno_status: m.alunos?.status ?? "Ativo",
        turma_id: m.turma_id,
        turma_nome: m.turmas?.nome ?? "—",
        turno: m.turmas?.turno ?? "",
        ano_letivo: m.turmas?.ano_letivo ?? 0,
        data_ingresso: m.data_ingresso,
        data_vencimento_matricula: m.data_vencimento_matricula,
        dia_vencimento_mensalidade: m.dia_vencimento_mensalidade,
        parcelas_taxa_matricula: m.parcelas_taxa_matricula,
        datas_taxa_matricula: m.datas_taxa_matricula ?? null,
        valor_taxa_matricula: m.valor_taxa_matricula != null ? Number(m.valor_taxa_matricula) : null,
        valor_mensalidade_negociado: m.valor_mensalidade_negociado != null ? Number(m.valor_mensalidade_negociado) : null,
        modalidade_financeira_id: m.modalidade_financeira_id,
        status_pagamento: m.status_pagamento,
        percentual_desconto: m.percentual_desconto,
        bolsa_100: m.bolsa_100,
        parcelas_geradas: parcelas.length,
        parcelas_pagas: parcelas.filter((p: any) => p.status === "Pago").length,
        valor_mensal: parcelas[0]?.valor ?? null,
        mensalidade_dividida: m.mensalidade_dividida ?? false,
        dividir_taxa_matricula: m.dividir_taxa_matricula ?? false,
        responsavel2_nome: m.responsavel2_nome ?? null,
        responsavel2_cpf: m.responsavel2_cpf ?? null,
        responsavel2_telefone: m.responsavel2_telefone ?? null,
        responsavel2_email: m.responsavel2_email ?? null,
        responsavel2_percentual: m.responsavel2_percentual != null ? Number(m.responsavel2_percentual) : 50,
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
    categoria_id: t.categoria_id,
    categoria_nome: t.categoria_nome,
  }));

  const loading = loadingMatriculas || loadingTurmas;

  const refetch = useCallback(async () => {
    await Promise.all([
      fetchMatriculas(),
      qc.invalidateQueries({ queryKey: turmasQueryKey(escolaAtivaId) }),
    ]);
  }, [fetchMatriculas, qc, escolaAtivaId]);

  const updateMatricula = useCallback(async (
    id: string,
    dados: {
      turma_id: string; data_ingresso: string; data_vencimento_matricula?: string | null; dia_vencimento_mensalidade?: number | null;
      percentual_desconto: number; bolsa_100: boolean; parcelas_taxa_matricula?: number; datas_taxa_matricula?: string[] | null;
      valor_taxa_matricula?: number | null; valor_mensalidade_negociado?: number | null; modalidade_financeira_id?: string | null;
      mensalidade_dividida?: boolean; dividir_taxa_matricula?: boolean; responsavel2_nome?: string | null;
      responsavel2_cpf?: string | null; responsavel2_telefone?: string | null; responsavel2_email?: string | null;
      responsavel2_percentual?: number;
    }
  ) => {
    const { error } = await supabase.from("matriculas").update({
      turma_id: dados.turma_id,
      data_ingresso: dados.data_ingresso,
      data_vencimento_matricula: dados.data_vencimento_matricula || null,
      dia_vencimento_mensalidade: dados.dia_vencimento_mensalidade ?? null,
      parcelas_taxa_matricula: dados.parcelas_taxa_matricula ?? 1,
      datas_taxa_matricula: dados.datas_taxa_matricula?.length ? dados.datas_taxa_matricula : null,
      valor_taxa_matricula: dados.valor_taxa_matricula ?? null,
      valor_mensalidade_negociado: dados.valor_mensalidade_negociado ?? null,
      modalidade_financeira_id: dados.modalidade_financeira_id ?? null,
      percentual_desconto: dados.bolsa_100 ? 0 : dados.percentual_desconto,
      bolsa_100: dados.bolsa_100,
      mensalidade_dividida: dados.mensalidade_dividida ?? false,
      dividir_taxa_matricula: dados.mensalidade_dividida ? (dados.dividir_taxa_matricula ?? false) : false,
      responsavel2_nome: dados.mensalidade_dividida ? (dados.responsavel2_nome?.trim() || null) : null,
      responsavel2_cpf: dados.mensalidade_dividida ? (dados.responsavel2_cpf || null) : null,
      responsavel2_telefone: dados.mensalidade_dividida ? (dados.responsavel2_telefone || null) : null,
      responsavel2_email: dados.mensalidade_dividida ? (dados.responsavel2_email?.trim() || null) : null,
      responsavel2_percentual: dados.responsavel2_percentual ?? 50,
    }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar matrícula: " + error.message);
      return false;
    }
    await refetch();
    return true;
  }, [refetch]);

  const recalcularFinanceiro = useCallback(async (matriculaId: string) => {
    const { error } = await supabase.rpc("recalcular_financeiro_matricula", { p_matricula_id: matriculaId });
    if (error) {
      toast.error("Erro ao recalcular parcelas: " + error.message);
      return false;
    }
    toast.success("Parcelas recalculadas! As já pagas foram mantidas.");
    await refetch();
    return true;
  }, [refetch]);

  // O que vai acontecer se a matrícula for excluída: quantas parcelas pagas (bloqueiam a exclusão),
  // quantas pendentes (somem junto com a matrícula) e, dessas, quantas têm boleto vivo registrado no
  // banco (Sicredi) — essas são automaticamente canceladas no banco por um gatilho já existente em
  // financeiro (trg_financeiro_cobranca_del -> cobranca_fila -> sicredi-processar-fila), não é preciso
  // fazer nada manual aqui além de deixar isso claro para quem está excluindo.
  const infoExclusaoMatricula = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("financeiro")
      .select("status, gateway_status")
      .eq("matricula_id", id);
    const parcelas = data ?? [];
    const pagas = parcelas.filter((p) => p.status === "Pago").length;
    const pendentes = parcelas.length - pagas;
    const registradasNoBanco = parcelas.filter((p) => p.status !== "Pago" && p.gateway_status === "registrado").length;
    return { pagas, pendentes, registradasNoBanco };
  }, []);

  const deleteMatricula = useCallback(async (id: string) => {
    const { count } = await supabase
      .from("financeiro")
      .select("id", { count: "exact", head: true })
      .eq("matricula_id", id)
      .eq("status", "Pago");
    if (count && count > 0) {
      toast.error("Não é possível excluir: já existem parcelas pagas para esta matrícula.");
      return false;
    }
    const { error } = await supabase.from("matriculas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir matrícula: " + error.message);
      return false;
    }
    toast.success("Matrícula excluída (e as parcelas pendentes junto, com os boletos registrados cancelados no banco).");
    await refetch();
    return true;
  }, [refetch]);

  return { matriculas, turmasComVagas, loading, refetch, updateMatricula, deleteMatricula, infoExclusaoMatricula, recalcularFinanceiro };
}
