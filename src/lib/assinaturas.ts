export const urlAssinatura = (token: string) => `${window.location.origin}/assinar/${token}`;

export const urlFuncaoAssinatura = (token: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assinatura-publica?t=${encodeURIComponent(token)}`;

export function linkWhatsapp(telefone: string | null | undefined, texto: string): string {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  const numero = digitos.length >= 10 && !digitos.startsWith("55") ? `55${digitos}` : digitos;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function formatarCpf(valor: string | null | undefined): string {
  const d = (valor ?? "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : (valor ?? "");
}

export function formatarDataHoraBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const escaparHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type SituacaoAssinatura =
  | "aguardando_escola"
  | "aguardando_familia"
  | "assinado"
  | "cancelado"
  | "expirado"
  | "bloqueado";

export const MAX_TENTATIVAS_CPF = 5;

export const situacaoAssinatura = (a: {
  assinado_em: string | null;
  cancelado_em: string | null;
  escola_assinou_em: string | null;
  expira_em?: string | null;
  tentativas_invalidas?: number | null;
}): SituacaoAssinatura => {
  if (a.assinado_em) return "assinado";
  if (a.cancelado_em) return "cancelado";
  if ((a.tentativas_invalidas ?? 0) >= MAX_TENTATIVAS_CPF) return "bloqueado";
  if (a.expira_em && new Date(a.expira_em).getTime() < Date.now()) return "expirado";
  return a.escola_assinou_em ? "aguardando_familia" : "aguardando_escola";
};

export type FormaAssinatura = "desenhada" | "nome" | "iniciais";
export type InfoAssinatura = { forma: FormaAssinatura; estilo: string | null };

const ROTULO_ESTILO: Record<string, string> = { dancing: "Elegante", vibes: "Clássica", caveat: "Manuscrita" };

/** Texto para o registro do documento: como a assinatura foi feita. Vazio quando o dado não existe (assinaturas antigas). */
export function rotuloFormaAssinatura(forma: string | null | undefined, estilo: string | null | undefined): string {
  if (forma === "desenhada") return "Desenhada à mão";
  const base = forma === "nome" ? "Nome por extenso digitado" : forma === "iniciais" ? "Iniciais digitadas (rubrica)" : "";
  if (!base) return "";
  const e = estilo ? ROTULO_ESTILO[estilo] : null;
  return e ? `${base}, letra ${e}` : base;
}
