import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

export interface FornecedorOption {
  id: string;
  nome: string;
  categoria: string;
}

/** Carrega fornecedores ativos (cadastro simples, pra pagamentos esporádicos). */
export function useFornecedores() {
  const { escolaAtivaId } = useEscolaAtiva();
  return useQuery({
    queryKey: ["fornecedores", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome, categoria")
        .eq("escola_id", escolaAtivaId!)
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []).map((f) => ({ ...f, categoria: f.categoria ?? "" })) as FornecedorOption[];
    },
  });
}
