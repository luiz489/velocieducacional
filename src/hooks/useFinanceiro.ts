import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

export type LancamentoRow = {
  id: string;
  aluno_nome: string;
  responsavel: string;
  descricao: string;
  tipo: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
};

export function useFinanceiro() {
  const { escolaAtivaId } = useEscolaAtiva();
  const [lancamentos, setLancamentos] = useState<LancamentoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLancamentos = useCallback(async () => {
    if (!escolaAtivaId) { setLancamentos([]); return; }
    const { data, error } = await supabase
      .from("financeiro")
      .select(`
        id, descricao, valor, data_vencimento, data_pagamento, status, tipo,
        matriculas ( alunos ( nome, responsavel_financeiro ) )
      `)
      .eq("escola_id", escolaAtivaId)
      .order("data_vencimento", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar financeiro: " + error.message);
      setLoading(false);
      return;
    }

    setLancamentos(
      (data ?? []).map((l: any) => ({
        id: l.id,
        aluno_nome: l.matriculas?.alunos?.nome ?? "—",
        responsavel: l.matriculas?.alunos?.responsavel_financeiro ?? "—",
        descricao: l.descricao,
        tipo: l.tipo,
        valor: Number(l.valor),
        data_vencimento: l.data_vencimento,
        data_pagamento: l.data_pagamento,
        status: l.status,
      }))
    );
    setLoading(false);
  }, [escolaAtivaId]);

  useEffect(() => {
    fetchLancamentos();
  }, [fetchLancamentos]);

  const confirmarPagamento = async (id: string) => {
    const { error } = await supabase
      .from("financeiro")
      .update({ status: "Pago", data_pagamento: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao confirmar pagamento: " + error.message);
      return false;
    }
    toast.success("Pagamento confirmado!");
    await fetchLancamentos();
    return true;
  };

  return { lancamentos, loading, confirmarPagamento, refetch: fetchLancamentos };
}
