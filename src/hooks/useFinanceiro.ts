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
  valor_integral: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
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
        id, descricao, valor, valor_integral, data_vencimento, data_pagamento, status, tipo, forma_pagamento,
        matriculas ( alunos ( nome, responsavel_financeiro ) )
      `)
      .eq("escola_id", escolaAtivaId)
      .eq("faturado", true)
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
        valor_integral: l.valor_integral != null ? Number(l.valor_integral) : null,
        data_vencimento: l.data_vencimento,
        data_pagamento: l.data_pagamento,
        status: l.status,
        forma_pagamento: l.forma_pagamento,
      }))
    );
    setLoading(false);
  }, [escolaAtivaId]);

  useEffect(() => {
    fetchLancamentos();
  }, [fetchLancamentos]);

  const confirmarPagamento = async (
    id: string,
    dataPagamento: string,
    formaPagamento: string,
    manterDesconto: boolean
  ) => {
    const { error } = await supabase.rpc("confirmar_pagamento_financeiro", {
      p_id: id,
      p_data_pagamento: dataPagamento,
      p_forma_pagamento: formaPagamento,
      p_manter_desconto: manterDesconto,
    });
    if (error) {
      toast.error("Erro ao confirmar pagamento: " + error.message);
      return false;
    }
    toast.success("Pagamento confirmado!");
    await fetchLancamentos();
    return true;
  };

  const desfazerConfirmacao = async (id: string) => {
    const { error } = await supabase.rpc("desfazer_confirmacao_pagamento", { p_id: id });
    if (error) {
      toast.error("Erro ao desfazer a confirmação: " + error.message);
      return false;
    }
    toast.success("Confirmação de pagamento desfeita!");
    await fetchLancamentos();
    return true;
  };

  return { lancamentos, loading, confirmarPagamento, desfazerConfirmacao, refetch: fetchLancamentos };
}
