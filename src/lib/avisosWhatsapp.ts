import { supabase } from "@/integrations/supabase/client";

export type Persona = "responsavel" | "pai" | "mae" | "ambos";
export const PERSONAS: { value: Persona; label: string }[] = [
  { value: "responsavel", label: "Responsável financeiro" },
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "ambos", label: "Pai e mãe (ambos)" },
];
export function personasParaEnviar(p: Persona): string[] {
  return p === "ambos" ? ["pai", "mae"] : [p];
}

/** Chama a Edge Function "avisos-whatsapp". Compartilhado entre a tela de Avisos por WhatsApp e
 * qualquer outra tela que precise disparar mensagem (ex.: Links de compra). */
export async function chamarAvisosWhatsapp<T = any>(
  acao: string,
  extra: Record<string, unknown> = {},
  escolaId?: string | null,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("avisos-whatsapp", { body: { acao, escola_id: escolaId, ...extra } });
  if (error) {
    // Quando a function responde com status != 2xx, o cliente não lê o corpo da resposta sozinho
    // (troca por um texto genérico tipo "Edge Function returned a non-2xx status code"). O corpo
    // real, com a mensagem útil, está em error.context.
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(corpo?.erro ?? error.message);
  }
  if (data && data.ok === false) throw new Error(data.erro ?? "Falha na operação.");
  return data as T;
}
