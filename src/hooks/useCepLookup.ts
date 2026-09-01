import { useState } from "react";

export type EnderecoPorCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/**
 * Busca o endereço a partir de um CEP (API pública ViaCEP). Chame `buscarCep`
 * assim que o CEP tiver 8 dígitos (ex: no onBlur ou onChange do campo).
 */
export function useCepLookup() {
  const [buscando, setBuscando] = useState(false);

  const buscarCep = async (cepDigitado: string): Promise<EnderecoPorCep | null> => {
    const cep = cepDigitado.replace(/\D/g, "");
    if (cep.length !== 8) return null;

    setBuscando(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await resposta.json();
      if (dados.erro) return null;
      return {
        logradouro: dados.logradouro || "",
        bairro: dados.bairro || "",
        cidade: dados.localidade || "",
        uf: dados.uf || "",
      };
    } catch {
      return null;
    } finally {
      setBuscando(false);
    }
  };

  return { buscarCep, buscando };
}

/** Aplica a máscara 00000-000 num CEP conforme o usuário digita. */
export function mascaraCEP(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 5) return digitos;
  return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
}
