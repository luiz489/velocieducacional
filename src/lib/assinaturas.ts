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

export type SituacaoAssinatura = "aguardando_escola" | "aguardando_familia" | "assinado" | "cancelado";

export const situacaoAssinatura = (a: {
  assinado_em: string | null;
  cancelado_em: string | null;
  escola_assinou_em: string | null;
}): SituacaoAssinatura =>
  a.assinado_em ? "assinado" : a.cancelado_em ? "cancelado" : a.escola_assinou_em ? "aguardando_familia" : "aguardando_escola";
