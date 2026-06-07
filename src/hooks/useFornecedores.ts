import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FornecedorOption {
  id: string;
  nome: string;
  categoria: string;
}

/** Carrega parceiros marcados como Fornecedor e ativos. */
export function useFornecedores() {
  return useQuery({
    queryKey: ["fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros")
        .select("id, nome, categoria")
        .eq("tipo", "Fornecedor")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as FornecedorOption[];
    },
  });
}
