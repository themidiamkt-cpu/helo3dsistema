import { describe, expect, it } from "vitest";
import {
  calculateEnergyCost,
  calculateFilamentCost,
  calculateGrossProfit,
  calculateMachineCost,
  calculatePriceByMarkup,
  calculatePricing,
  calculateSalesMarginPercentage,
  calculateSupplyCost,
  calculateUnitCost,
  calculateWasteCost,
  ensureSufficientStock,
} from "./pricing";

describe("pricing calculations", () => {
  it("calcula custo de filamentos", () => {
    expect(calculateFilamentCost([{ weightGrams: 320, costPerGram: 0.099 }, { weightGrams: 254, costPerGram: 0.099 }])).toBeCloseTo(56.826);
  });

  it("calcula energia", () => {
    expect(calculateEnergyCost(60, 80, 1.1)).toBeCloseTo(0.088);
  });

  it("calcula maquina", () => {
    expect(calculateMachineCost(120, 3)).toBe(6);
  });

  it("calcula componentes", () => {
    expect(calculateSupplyCost([{ quantity: 25, unitCost: 2.3 }])).toBeCloseTo(57.5);
  });

  it("calcula desperdicio", () => {
    expect(calculateWasteCost(100, 5)).toBe(5);
  });

  it("calcula custo total, unidade, markup, lucro e margem", () => {
    const result = calculatePricing({
      filaments: [{ weightGrams: 1000, costPerGram: 0.1 }],
      supplies: [],
      printTimeMinutes: 60,
      batchQuantity: 10,
      packagingCost: 0,
      fixedLaborCost: 0,
      laborTimeMinutes: 0,
      laborCostPerHour: 0,
      machineCostPerHour: 0,
      energyCostPerKwh: 0,
      printerPowerWatts: 0,
      wastePercentage: 0,
      markup: 2.5,
    });

    expect(result.totalBatchCost).toBe(100);
    expect(result.unitCost).toBe(10);
    expect(result.suggestedBatchPrice).toBe(250);
    expect(result.suggestedUnitPrice).toBe(25);
    expect(result.grossProfit).toBe(150);
    expect(result.salesMarginPercentage).toBe(60);
  });

  it("trata divisao por zero", () => {
    expect(() => calculateUnitCost(100, 0)).toThrow("Quantidade produzida");
  });

  it("valida markup", () => {
    expect(calculatePriceByMarkup(100, 2.5)).toBe(250);
    expect(calculateGrossProfit(250, 100)).toBe(150);
    expect(calculateSalesMarginPercentage(250, 100)).toBe(60);
  });

  it("bloqueia estoque insuficiente", () => {
    expect(() => ensureSufficientStock(10, 11)).toThrow("Estoque insuficiente");
    expect(ensureSufficientStock(10, 11, true)).toBe(true);
  });
});

