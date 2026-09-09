export function money(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function numberPt(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function datePt(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function trendLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    TRENDING_UP: "Subindo",
    STABLE: "Estavel",
    TRENDING_DOWN: "Caindo",
    INSUFFICIENT_DATA: "Historico insuficiente",
  };
  return labels[value ?? ""] ?? "-";
}

export function lifecycleLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    NEW: "Novo",
    EMERGING: "Emergente",
    HOT: "Quente",
    STABLE: "Estavel",
    SATURATED: "Saturado",
    DECLINING: "Declinando",
  };
  return labels[value ?? ""] ?? "-";
}
