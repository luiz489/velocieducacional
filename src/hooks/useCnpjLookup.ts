import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = "https://mqjsfmhqxdbtanrqizvr.supabase.co/functions/v1";

export type DadosPorCnpj = {
  razaoSocial: string;
  nomeFantasia: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  situacaoCadastral: string;
};

/**
 * Busca dados cadastrais de uma empresa a partir do CNPJ (dados oficiais da
 * Receita Federal, via BrasilAPI). A chamada passa pela nossa Edge Function
 * "cnpj-lookup" (não é feita direto do navegador) - evita qualquer bloqueio
 * de CORS que a API pública possa ter pra chamadas vindas de um site.
 */
export function useCnpjLookup() {
  const [buscando, setBuscando] = useState(false);

  const buscarCnpj = async (cnpjDigitado: string): Promise<{ dados: DadosPorCnpj | null; erro: string | null }> => {
    const cnpj = cnpjDigitado.replace(/\D/g, "");
    if (cnpj.length !== 14) return { dados: null, erro: null };

    setBuscando(true);
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const token = sessao.session?.access_token;

      const resposta = await fetch(`${FUNCTIONS_URL}/cnpj-lookup?cnpj=${cnpj}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const dados = await resposta.json();
      if (!resposta.ok || dados.error) {
        return { dados: null, erro: dados.error || "Não foi possível buscar os dados deste CNPJ." };
      }

      return {
        dados: {
          razaoSocial: dados.razao_social || "",
          nomeFantasia: dados.nome_fantasia || "",
          logradouro: [dados.logradouro, dados.numero].filter(Boolean).join(", ") || "",
          numero: dados.numero || "",
          bairro: dados.bairro || "",
          cidade: dados.municipio || "",
          uf: dados.uf || "",
          cep: dados.cep || "",
          telefone: dados.ddd_telefone_1 || "",
          email: dados.email || "",
          situacaoCadastral: dados.descricao_situacao_cadastral || "",
        },
        erro: null,
      };
    } catch (e: any) {
      return { dados: null, erro: "Erro ao buscar CNPJ: " + e.message };
    } finally {
      setBuscando(false);
    }
  };

  return { buscarCnpj, buscando };
}

/** Aplica a máscara 00.000.000/0000-00 num CNPJ conforme o usuário digita. */
export function mascaraCNPJ(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
