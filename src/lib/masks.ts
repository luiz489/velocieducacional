/**
 * Aplica máscara de CPF no formato 000.000.000-00 enquanto o usuário digita.
 * Aceita entrada com ou sem pontuação e limita a 11 dígitos.
 */
export function mascaraCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/**
 * Remove toda pontuação do CPF, retornando apenas os 11 dígitos numéricos.
 */
export function limparCPF(valor: string): string {
  return valor.replace(/\D/g, "");
}
