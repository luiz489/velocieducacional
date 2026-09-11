/**
 * Códigos de escola (formato EEUU) usados para amarrar customizações
 * específicas de um colégio.
 *
 *   EE = empresa (grupo econômico, ou a própria escola se avulsa)
 *   UU = unidade dentro da empresa (01 = matriz)
 *
 * Sempre que uma alteração de código valer só para uma escola, referencie a
 * constante daqui em vez de comparar id ou nome. Ex.:
 *
 *   const { codigoEscolaAtiva } = useEscolaAtiva();
 *   if (ehEscola(codigoEscolaAtiva, ESCOLA.DM_NUCLEO)) { ... }
 *
 * O código é gerenciável na plataforma do dono (Clientes → menu ⋮ → Editar código).
 */
export const ESCOLA = {
  /** Colégio DM — matriz (DM Núcleo). */
  DM_NUCLEO: "0101",
  /** Colégio DM — Unidade 2 (Doce Mel). */
  DM_UNIDADE_2: "0102",
} as const;

export type CodigoEscola = (typeof ESCOLA)[keyof typeof ESCOLA];

/** true se `codigo` for um dos códigos informados. */
export function ehEscola(codigo: string | null | undefined, ...codigos: string[]): boolean {
  return !!codigo && codigos.includes(codigo);
}

/** true se `codigo` pertence à empresa (grupo) informada, ex.: `ehEmpresa(codigo, "01")`. */
export function ehEmpresa(codigo: string | null | undefined, numeroEmpresa: string): boolean {
  return !!codigo && codigo.slice(0, 2) === numeroEmpresa.padStart(2, "0");
}
