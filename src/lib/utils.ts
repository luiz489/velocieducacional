import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata uma data (YYYY-MM-DD ou timestamp ISO) como DD/MM/AAAA sem sofrer o
 * deslocamento de fuso do `new Date(string)`, que interpreta data pura como UTC
 * e mostra "um dia a menos" no Brasil. */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}
