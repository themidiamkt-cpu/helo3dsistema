import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function formatDecimal(value: number | null | undefined, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

export function formatWeight(value: number | null | undefined) {
  return `${formatDecimal(value, 1)} g`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatMinutes(totalMinutes: number | null | undefined) {
  const safeMinutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}

export function parseBrazilianCurrency(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

