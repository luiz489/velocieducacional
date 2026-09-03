import { useState } from "react";

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
 * Busca dados cadastrais de uma empresa a partir do CNPJ (API pública
 * BrasilAPI, dados oficiais da Receita Federal). Chame `buscarCnpj` assim
 * que o CNPJ tiver 14 dígitos (ex: no onBlur do campo).
 */
export function useCnpjLookup() {
  const [buscando, setBuscando] = useState(false);

  const buscarCnpj = async (cnpjDigitado: string): Promise<DadosPorCnpj | null> => {
    const cnpj = cnpjDigitado.replace(/\D/g, "");
    if (cnpj.length !== 14) return null;

    setBuscando(true);
    try {
      const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!resposta.ok) return null;
      const dados = await resposta.json();
      return {
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
      };
    } catch {
      return null;
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
