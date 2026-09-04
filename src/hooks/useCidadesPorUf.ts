import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = "https://mqjsfmhqxdbtanrqizvr.supabase.co/functions/v1";

/**
 * Busca as cidades de um estado brasileiro via API do IBGE (passa pela nossa
 * Edge Function pra evitar qualquer bloqueio de CORS do navegador). Os
 * resultados ficam em cache por UF - trocar de estado não refaz a busca se
 * já tiver sido feita antes nesta sessão.
 */
export function useCidadesPorUf(uf: string | undefined | null) {
  return useQuery({
    queryKey: ["cidades-ibge", uf],
    enabled: !!uf && uf.length === 2,
    staleTime: 1000 * 60 * 60, // 1 hora - cidades de um estado não mudam
    queryFn: async () => {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;
      const resposta = await fetch(`${FUNCTIONS_URL}/ibge-municipios?uf=${uf}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const dados = await resposta.json();
      if (!resposta.ok || dados.error) {
        throw new Error(dados.error || "Não foi possível buscar as cidades.");
      }
      return dados.cidades as string[];
    },
  });
}
