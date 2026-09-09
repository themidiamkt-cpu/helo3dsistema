export type PricingFilamentInput = {
  weightGrams: number;
  costPerGram: number;
};

export type PricingSupplyInput = {
  quantity: number;
  unitCost: number;
};

export type PricingInput = {
  filaments: PricingFilamentInput[];
  supplies: PricingSupplyInput[];
  printTimeMinutes: number;
  batchQuantity: number;
  packagingCost: number;
  fixedLaborCost: number;
  laborTimeMinutes: number;
  laborCostPerHour: number;
  machineCostPerHour: number;
  energyCostPerKwh: number;
  printerPowerWatts: number;
  wastePercentage: number;
  markup: number;
};

export type PricingBreakdown = {
  filamentCost: number;
  energyCost: number;
  machineCost: number;
  supplyCost: number;
  packagingCost: number;
  laborCost: number;
  wasteCost: number;
  totalBatchCost: number;
  unitCost: number;
  suggestedBatchPrice: number;
  suggestedUnitPrice: number;
  grossProfit: number;
  salesMarginPercentage: number;
  markupOptions: Array<{
    markup: number;
    batchPrice: number;
    unitPrice: number;
    grossProfit: number;
    salesMarginPercentage: number;
  }>;
};

export function assertNonNegative(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} deve ser um numero valido e nao negativo.`);
  }
}

export function calculateFilamentCost(filaments: PricingFilamentInput[]) {
  return filaments.reduce((total, item) => {
    assertNonNegative(item.weightGrams, "Peso do filamento");
    assertNonNegative(item.costPerGram, "Custo por grama");
    return total + item.weightGrams * item.costPerGram;
  }, 0);
}

export function calculateEnergyCost(printTimeMinutes: number, printerPowerWatts: number, energyCostPerKwh: number) {
  assertNonNegative(printTimeMinutes, "Tempo de impressao");
  assertNonNegative(printerPowerWatts, "Potencia da impressora");
  assertNonNegative(energyCostPerKwh, "Custo de energia");
  return (printerPowerWatts / 1000) * (printTimeMinutes / 60) * energyCostPerKwh;
}

export function calculateMachineCost(printTimeMinutes: number, machineCostPerHour: number) {
  assertNonNegative(printTimeMinutes, "Tempo de impressao");
  assertNonNegative(machineCostPerHour, "Custo da maquina");
  return (printTimeMinutes / 60) * machineCostPerHour;
}

export function calculateSupplyCost(supplies: PricingSupplyInput[]) {
  return supplies.reduce((total, item) => {
    assertNonNegative(item.quantity, "Quantidade do componente");
    assertNonNegative(item.unitCost, "Custo unitario");
    return total + item.quantity * item.unitCost;
  }, 0);
}

export function calculateLaborCost(fixedLaborCost: number, laborTimeMinutes: number, laborCostPerHour: number) {
  assertNonNegative(fixedLaborCost, "Custo fixo de mao de obra");
  assertNonNegative(laborTimeMinutes, "Tempo de mao de obra");
  assertNonNegative(laborCostPerHour, "Custo hora de mao de obra");
  return fixedLaborCost + (laborTimeMinutes / 60) * laborCostPerHour;
}

export function calculateWasteCost(materialSubtotal: number, wastePercentage: number) {
  assertNonNegative(materialSubtotal, "Subtotal de materiais");
  assertNonNegative(wastePercentage, "Percentual de desperdicio");
  return materialSubtotal * (wastePercentage / 100);
}

export function calculateUnitCost(totalBatchCost: number, batchQuantity: number) {
  assertNonNegative(totalBatchCost, "Custo total");
  if (!Number.isFinite(batchQuantity) || batchQuantity <= 0) {
    throw new Error("Quantidade produzida deve ser maior que zero.");
  }
  return totalBatchCost / batchQuantity;
}

export function calculatePriceByMarkup(totalCost: number, markup: number) {
  assertNonNegative(totalCost, "Custo total");
  if (!Number.isFinite(markup) || markup <= 0) {
    throw new Error("Markup deve ser maior que zero.");
  }
  return totalCost * markup;
}

export function calculateGrossProfit(salePrice: number, totalCost: number) {
  assertNonNegative(salePrice, "Preco de venda");
  assertNonNegative(totalCost, "Custo total");
  return salePrice - totalCost;
}

export function calculateSalesMarginPercentage(salePrice: number, totalCost: number) {
  assertNonNegative(salePrice, "Preco de venda");
  assertNonNegative(totalCost, "Custo total");
  if (salePrice <= 0) return 0;
  return ((salePrice - totalCost) / salePrice) * 100;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  if (!Number.isFinite(input.batchQuantity) || input.batchQuantity <= 0) {
    throw new Error("Quantidade produzida deve ser maior que zero.");
  }

  const filamentCost = calculateFilamentCost(input.filaments);
  const supplyCost = calculateSupplyCost(input.supplies);
  const energyCost = calculateEnergyCost(input.printTimeMinutes, input.printerPowerWatts, input.energyCostPerKwh);
  const machineCost = calculateMachineCost(input.printTimeMinutes, input.machineCostPerHour);
  const laborCost = calculateLaborCost(input.fixedLaborCost, input.laborTimeMinutes, input.laborCostPerHour);
  assertNonNegative(input.packagingCost, "Custo de embalagem");

  const wasteCost = calculateWasteCost(filamentCost + supplyCost, input.wastePercentage);
  const totalBatchCost = filamentCost + energyCost + machineCost + supplyCost + input.packagingCost + laborCost + wasteCost;
  const unitCost = calculateUnitCost(totalBatchCost, input.batchQuantity);
  const suggestedBatchPrice = calculatePriceByMarkup(totalBatchCost, input.markup);
  const suggestedUnitPrice = suggestedBatchPrice / input.batchQuantity;
  const grossProfit = calculateGrossProfit(suggestedBatchPrice, totalBatchCost);
  const salesMarginPercentage = calculateSalesMarginPercentage(suggestedBatchPrice, totalBatchCost);
  const optionMarkups = Array.from(new Set([2, 2.5, 3, input.markup]));

  return {
    filamentCost,
    energyCost,
    machineCost,
    supplyCost,
    packagingCost: input.packagingCost,
    laborCost,
    wasteCost,
    totalBatchCost,
    unitCost,
    suggestedBatchPrice,
    suggestedUnitPrice,
    grossProfit,
    salesMarginPercentage,
    markupOptions: optionMarkups.map((markup) => {
      const batchPrice = calculatePriceByMarkup(totalBatchCost, markup);
      return {
        markup,
        batchPrice,
        unitPrice: batchPrice / input.batchQuantity,
        grossProfit: calculateGrossProfit(batchPrice, totalBatchCost),
        salesMarginPercentage: calculateSalesMarginPercentage(batchPrice, totalBatchCost),
      };
    }),
  };
}

export function ensureSufficientStock(currentBalance: number, requestedQuantity: number, allowNegative = false) {
  assertNonNegative(requestedQuantity, "Quantidade solicitada");
  if (!allowNegative && requestedQuantity > currentBalance) {
    throw new Error("Estoque insuficiente para concluir a operacao.");
  }
  return true;
}

