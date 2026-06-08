/**
 * Valida um CPF brasileiro verificando formato e dígitos verificadores.
 * Aceita formatado (000.000.000-00) ou apenas números (00000000000).
 * Retorna `null` se válido, ou mensagem de erro se inválido.
 */
export function validarCPF(cpf: string): string | null {
  const limpo = cpf.replace(/\D/g, "");

  if (limpo.length !== 11) {
    return "CPF deve conter 11 dígitos numéricos.";
  }

  if (/^(\d)\1{10}$/.test(limpo)) {
    return "CPF inválido (sequência repetida).";
  }

  // Primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(limpo[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[9])) {
    return "CPF inválido (dígito verificador incorreto).";
  }

  // Segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(limpo[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(limpo[10])) {
    return "CPF inválido (dígito verificador incorreto).";
  }

  return null;
}
