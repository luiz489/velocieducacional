import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEscolaAtiva } from "@/contexts/EscolaContext";

export interface FornecedorOption {
  id: string;
  nome: string;
  categoria: string;
}

/** Carrega parceiros marcados como Fornecedor e ativos. */
export function useFornecedores() {
  const { escolaAtivaId } = useEscolaAtiva();
  return useQuery({
    queryKey: ["fornecedores", escolaAtivaId],
    enabled: !!escolaAtivaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("id, nome, categoria")
        .eq("escola_id", escolaAtivaId!)
        .eq("tipo", "Fornecedor")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as FornecedorOption[];
    },
  });
}
