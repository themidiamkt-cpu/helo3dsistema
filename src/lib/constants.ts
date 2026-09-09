export const MATERIALS = ["PLA", "PLA+", "PETG", "ABS", "ASA", "TPU", "Nylon", "Outro"] as const;
export const SUPPLY_UNITS = ["unidade", "pacote", "metro", "grama", "quilograma"] as const;
export const SUPPLY_CATEGORIES = [
  "clicker",
  "ima",
  "mola",
  "parafuso",
  "argola",
  "chaveiro",
  "caixa",
  "saco plastico",
  "etiqueta",
  "fita",
  "parte impressa",
  "outro",
] as const;
export const PRODUCTION_STATUSES = [
  "draft",
  "waiting",
  "slicing",
  "printing",
  "finishing",
  "completed",
  "failed",
  "cancelled",
] as const;
export const PRINTER_STATUSES = ["available", "printing", "maintenance", "inactive"] as const;

export const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  waiting: "Aguardando",
  slicing: "Fatiando",
  printing: "Imprimindo",
  finishing: "Acabamento",
  completed: "Concluida",
  failed: "Falhou",
  cancelled: "Cancelada",
  available: "Disponivel",
  maintenance: "Manutencao",
  inactive: "Inativa",
};

export const DEFAULT_SETTINGS = {
  energyCostPerKwh: 1.1,
  printerPowerWatts: 80,
  machineCostPerHour: 3,
  laborCostPerHour: 0,
  wastePercentage: 5,
  markup: 2.5,
  minimumProfitMargin: 40,
} as const;
