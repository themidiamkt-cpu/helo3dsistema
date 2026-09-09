"use server";

import { revalidatePath } from "next/cache";
import { calculatePricing } from "@/lib/calculations/pricing";
import { buildProductDescription, getProductParts, getProductPublicDescription, type ProductPartDefinition } from "@/lib/products/parts";
import { calculateChannelFee, parseSalesChannels, serializeSalesChannels, type SalesChannel } from "@/lib/sales/channels";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/session";
import {
  filamentSchema,
  printerSchema,
  productSchema,
  productionOrderSchema,
  saleSchema,
  salesChannelSchema,
  settingsSchema,
  supplySchema,
} from "@/lib/validations/schemas";
import type { Product } from "@/types/database";

type MutationResult = { ok: boolean; message: string };
type SupabaseClient = Awaited<ReturnType<typeof getCurrentProfile>>["supabase"];

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function optionalText(value: string | undefined) {
  return value?.trim() ? value.trim() : null;
}

function optionalNumber(value: number | undefined, options?: { zeroAsNull?: boolean }) {
  if (value === undefined || Number.isNaN(value)) return null;
  if (options?.zeroAsNull && value === 0) return null;
  return value;
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

async function getSalesChannels(supabase: SupabaseClient, organizationId: string) {
  const { data, error } = await supabase
    .from("organization_settings")
    .select("rounding_rule")
    .eq("organization_id", organizationId)
    .single();
  if (error) return { channels: [] as SalesChannel[], error: error.message };
  return { channels: parseSalesChannels(data.rounding_rule), error: null };
}

async function getProductPricingContext(supabase: SupabaseClient, organizationId: string, printerId: string) {
  const [printerResult, settingsResult] = await Promise.all([
    supabase
      .from("printers")
      .select("id, power_watts, machine_cost_per_hour")
      .eq("id", printerId)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .single(),
    supabase.from("organization_settings").select("*").eq("organization_id", organizationId).single(),
  ]);

  if (printerResult.error) return { ok: false as const, message: "Selecione uma impressora ativa cadastrada." };
  if (settingsResult.error) return { ok: false as const, message: settingsResult.error.message };

  return {
    ok: true as const,
    printer: printerResult.data,
    settings: settingsResult.data,
  };
}

async function buildStoredProductPricing(supabase: SupabaseClient, product: Product, settings: {
  energy_cost_per_kwh: number;
  default_labor_cost_per_hour: number;
  default_waste_percentage: number;
  default_markup: number;
}) {
  if (!product.printer_id) return null;

  const [printerResult, supplyLinesResult, filamentLinesResult] = await Promise.all([
    supabase
      .from("printers")
      .select("power_watts, machine_cost_per_hour")
      .eq("id", product.printer_id)
      .eq("organization_id", product.organization_id)
      .eq("active", true)
      .single(),
    supabase.from("product_supplies").select("supply_id, quantity").eq("product_id", product.id),
    supabase.from("product_filaments").select("filament_id, weight_grams").eq("product_id", product.id),
  ]);

  if (printerResult.error) return null;

  const supplyIds = supplyLinesResult.data?.map((item) => item.supply_id) ?? [];
  const filamentIds = filamentLinesResult.data?.map((item) => item.filament_id) ?? [];
  const [suppliesResult, filamentsResult] = await Promise.all([
    supplyIds.length ? supabase.from("inventory_supplies").select("id, unit_cost").in("id", supplyIds) : { data: [] },
    filamentIds.length ? supabase.from("filaments").select("id, cost_per_gram").in("id", filamentIds) : { data: [] },
  ]);

  const supplyCostById = new Map((suppliesResult.data ?? []).map((item) => [item.id, item.unit_cost]));
  const filamentCostById = new Map((filamentsResult.data ?? []).map((item) => [item.id, item.cost_per_gram]));
  const pricing = calculatePricing({
    filaments: (filamentLinesResult.data ?? []).map((item) => ({
      weightGrams: item.weight_grams,
      costPerGram: filamentCostById.get(item.filament_id) ?? 0,
    })),
    supplies: (supplyLinesResult.data ?? []).map((item) => ({
      quantity: item.quantity,
      unitCost: supplyCostById.get(item.supply_id) ?? 0,
    })),
    printTimeMinutes: product.print_time_minutes,
    batchQuantity: product.batch_quantity,
    packagingCost: product.packaging_cost,
    fixedLaborCost: product.fixed_labor_cost,
    laborTimeMinutes: product.labor_time_minutes,
    laborCostPerHour: settings.default_labor_cost_per_hour,
    machineCostPerHour: printerResult.data.machine_cost_per_hour,
    energyCostPerKwh: settings.energy_cost_per_kwh,
    printerPowerWatts: printerResult.data.power_watts,
    wastePercentage: settings.default_waste_percentage,
    markup: settings.default_markup,
  });

  return {
    machine_cost_per_hour: printerResult.data.machine_cost_per_hour,
    printer_power_watts: printerResult.data.power_watts,
    energy_cost_per_kwh: settings.energy_cost_per_kwh,
    waste_percentage: settings.default_waste_percentage,
    desired_markup: settings.default_markup,
    calculated_cost: pricing.totalBatchCost,
    calculated_unit_cost: pricing.unitCost,
    calculated_sale_price: pricing.suggestedUnitPrice,
  };
}

async function recalculateActiveProducts(supabase: SupabaseClient, organizationId: string, settings: {
  energy_cost_per_kwh: number;
  default_labor_cost_per_hour: number;
  default_waste_percentage: number;
  default_markup: number;
}, printerId?: string) {
  let query = supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true);

  if (printerId) query = query.eq("printer_id", printerId);

  const { data: products, error } = await query;
  if (error) return error.message;

  await Promise.all(
    (products ?? []).map(async (product) => {
      const pricing = await buildStoredProductPricing(supabase, product, settings);
      if (!pricing) return;
      await supabase
        .from("products")
        .update(pricing)
        .eq("id", product.id)
        .eq("organization_id", organizationId);
    }),
  );

  return null;
}

function parseOrderFilaments(formData: FormData) {
  const lines = JSON.parse(value(formData, "filaments") || "[]") as Array<{ part_name?: string; filament_id: string; quantity?: number; weight_grams: number; print_time_minutes?: number }>;
  return lines
    .map((line, index) => ({
      part_name: optionalText(line.part_name) ?? `Parte ${index + 1}`,
      filament_id: line.filament_id,
      quantity: Math.max(1, Number(line.quantity) || 1),
      weight_grams: Number(line.weight_grams),
      print_time_minutes: Math.max(0, Number(line.print_time_minutes) || 0),
    }))
    .filter((line) => line.filament_id && Number.isFinite(line.weight_grams) && line.weight_grams > 0);
}

function parsePartDetails(formData: FormData): ProductPartDefinition[] {
  try {
    const parsed = JSON.parse(value(formData, "part_details") || "[]") as Array<{ name?: string; weightGrams?: number; printTimeMinutes?: number }>;
    return parsed
      .map((item) => ({
        name: optionalText(item.name) ?? "",
        weightGrams: Number(item.weightGrams) || 0,
        printTimeMinutes: Number(item.printTimeMinutes) || 0,
      }))
      .filter((item) => item.name);
  } catch {
    return [];
  }
}

function parsePartNames(formData: FormData) {
  try {
    const parsed = JSON.parse(value(formData, "part_names") || "[]") as string[];
    return parsed.map((item) => optionalText(item)).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

function parseAssemblySupplies(formData: FormData) {
  const lines = JSON.parse(value(formData, "supplies") || "[]") as Array<{ supply_id: string; quantity: number }>;
  return lines
    .map((line) => ({ supply_id: line.supply_id, quantity: Number(line.quantity) }))
    .filter((line) => line.supply_id && Number.isFinite(line.quantity) && line.quantity > 0);
}

function parsePrintedPartOutputs(formData: FormData) {
  try {
    const lines = JSON.parse(value(formData, "printed_parts") || "[]") as Array<{
      name?: string;
      supply_id: string;
      produced_quantity: number;
      failed_quantity?: number;
      total_weight_grams: number;
    }>;
    return lines
      .map((line, index) => ({
        name: optionalText(line.name) ?? `Parte ${index + 1}`,
        supply_id: line.supply_id,
        produced_quantity: Number(line.produced_quantity),
        failed_quantity: Number(line.failed_quantity ?? 0),
        total_weight_grams: Number(line.total_weight_grams),
      }))
      .filter((line) => line.supply_id && Number.isFinite(line.produced_quantity) && Number.isFinite(line.failed_quantity) && Number.isFinite(line.total_weight_grams) && line.total_weight_grams > 0);
  } catch {
    return [];
  }
}

function parseOrderPartGroupsFromNotes(notes: string | null) {
  if (!notes) return [];
  const groups = new Map<string, { key: string; quantity: number; totalWeightGrams: number }>();
  const matcher = /(?:^|Partes:\s*|;\s*)\d+\.\s*([^:]+):\s*([\d,.]+)\s*un\s*x\s*([\d,.]+)\s*g/gi;
  for (const match of notes.matchAll(matcher)) {
    const name = match[1]?.trim() ?? "";
    const key = name.match(/^(Parte\s+\d+)/i)?.[1] ?? name;
    const quantity = parseFlexibleNumber(match[2] ?? "0");
    const weightGrams = parseFlexibleNumber(match[3] ?? "0");
    if (!key || quantity <= 0 || weightGrams <= 0) continue;
    const current = groups.get(key) ?? { key, quantity: 0, totalWeightGrams: 0 };
    current.quantity = Math.max(current.quantity, quantity);
    current.totalWeightGrams += quantity * weightGrams;
    groups.set(key, current);
  }
  return Array.from(groups.values());
}

function parseFlexibleNumber(value: string) {
  return value.includes(",") ? Number(value.replace(/\./g, "").replace(",", ".")) : Number(value);
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function createFilamentAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = filamentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const payload = {
    ...parsed.data,
    organization_id: organizationId,
    brand: optionalText(parsed.data.brand),
    color_name: optionalText(parsed.data.color_name),
    color_hex: optionalText(parsed.data.color_hex),
    supplier: optionalText(parsed.data.supplier),
    purchase_date: optionalText(parsed.data.purchase_date),
    lot_number: optionalText(parsed.data.lot_number),
    notes: optionalText(parsed.data.notes),
  };
  const { error } = await supabase.from("filaments").insert(payload);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/filamentos");
  return { ok: true, message: "Filamento cadastrado." };
}

export async function updateFilamentAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Filamento nao encontrado." };

  const parsed = filamentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const payload = {
    ...parsed.data,
    brand: optionalText(parsed.data.brand),
    color_name: optionalText(parsed.data.color_name),
    color_hex: optionalText(parsed.data.color_hex),
    supplier: optionalText(parsed.data.supplier),
    purchase_date: optionalText(parsed.data.purchase_date),
    lot_number: optionalText(parsed.data.lot_number),
    notes: optionalText(parsed.data.notes),
  };
  const { error } = await supabase
    .from("filaments")
    .update(payload)
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/filamentos");
  revalidatePath("/estoque");
  return { ok: true, message: "Filamento atualizado." };
}

export async function duplicateFilamentAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };

  const { data: filament, error: readError } = await supabase
    .from("filaments")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (readError) return { ok: false, message: readError.message };

  const { error } = await supabase.from("filaments").insert({
    organization_id: profile.organization_id,
    name: `${filament.name} (copia)`,
    brand: filament.brand,
    material: filament.material,
    color_name: filament.color_name,
    color_hex: filament.color_hex,
    supplier: filament.supplier,
    initial_weight_grams: filament.initial_weight_grams,
    current_weight_grams: filament.current_weight_grams,
    spool_weight_grams: filament.spool_weight_grams,
    purchase_price: filament.purchase_price,
    minimum_stock_grams: filament.minimum_stock_grams,
    purchase_date: filament.purchase_date,
    lot_number: filament.lot_number,
    notes: filament.notes,
    active: true,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/filamentos");
  return { ok: true, message: "Filamento duplicado." };
}

export async function deleteFilamentAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };

  const { error } = await supabase
    .from("filaments")
    .update({ active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/filamentos");
  revalidatePath("/estoque");
  return { ok: true, message: "Filamento excluido." };
}

export async function createSupplyAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = supplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { error } = await supabase.from("inventory_supplies").insert({
    ...parsed.data,
    organization_id: organizationId,
    sku: optionalText(parsed.data.sku),
    supplier: optionalText(parsed.data.supplier),
    notes: optionalText(parsed.data.notes),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/componentes");
  return { ok: true, message: "Componente cadastrado." };
}

export async function updateSupplyAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Item nao encontrado." };
  const parsed = supplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { error } = await supabase
    .from("inventory_supplies")
    .update({
      ...parsed.data,
      sku: optionalText(parsed.data.sku),
      supplier: optionalText(parsed.data.supplier),
      notes: optionalText(parsed.data.notes),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/componentes");
  revalidatePath("/estoque");
  return { ok: true, message: "Item atualizado." };
}

export async function duplicateSupplyAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { data: supply, error: readError } = await supabase
    .from("inventory_supplies")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (readError) return { ok: false, message: readError.message };

  const { error } = await supabase.from("inventory_supplies").insert({
    organization_id: profile.organization_id,
    name: `${supply.name} (copia)`,
    sku: null,
    category: supply.category,
    unit: supply.unit,
    current_quantity: supply.current_quantity,
    minimum_quantity: supply.minimum_quantity,
    purchase_quantity: supply.purchase_quantity,
    purchase_price: supply.purchase_price,
    supplier: supply.supplier,
    notes: supply.notes,
    active: true,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/componentes");
  return { ok: true, message: "Item duplicado." };
}

export async function deleteSupplyAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { error } = await supabase
    .from("inventory_supplies")
    .update({ active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/componentes");
  revalidatePath("/estoque");
  return { ok: true, message: "Item excluido." };
}

export async function createPrinterAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = printerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { error } = await supabase.from("printers").insert({
    ...parsed.data,
    organization_id: organizationId,
    model: optionalText(parsed.data.model),
    purchase_price: optionalNumber(parsed.data.purchase_price),
    purchase_date: optionalText(parsed.data.purchase_date),
    maintenance_interval_hours: optionalNumber(parsed.data.maintenance_interval_hours),
    next_maintenance_at_hours: optionalNumber(parsed.data.next_maintenance_at_hours),
    notes: optionalText(parsed.data.notes),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/impressoras");
  return { ok: true, message: "Impressora cadastrada." };
}

export async function updatePrinterAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Impressora nao encontrada." };

  const parsed = printerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { error } = await supabase
    .from("printers")
    .update({
      ...parsed.data,
      model: optionalText(parsed.data.model),
      purchase_price: optionalNumber(parsed.data.purchase_price),
      purchase_date: optionalText(parsed.data.purchase_date),
      maintenance_interval_hours: optionalNumber(parsed.data.maintenance_interval_hours),
      next_maintenance_at_hours: optionalNumber(parsed.data.next_maintenance_at_hours),
      notes: optionalText(parsed.data.notes),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  const { data: settings } = await supabase.from("organization_settings").select("*").eq("organization_id", profile.organization_id).single();
  if (settings) await recalculateActiveProducts(supabase, profile.organization_id, settings, id);
  revalidatePath("/impressoras");
  revalidatePath("/produtos");
  revalidatePath("/dashboard");
  return { ok: true, message: "Impressora atualizada." };
}

export async function duplicatePrinterAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };

  const { data: printer, error: readError } = await supabase
    .from("printers")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (readError) return { ok: false, message: readError.message };

  const { error } = await supabase.from("printers").insert({
    organization_id: profile.organization_id,
    name: `${printer.name} (copia)`,
    model: printer.model,
    power_watts: printer.power_watts,
    machine_cost_per_hour: printer.machine_cost_per_hour,
    purchase_price: printer.purchase_price,
    purchase_date: printer.purchase_date,
    status: "available",
    total_printed_hours: 0,
    maintenance_interval_hours: printer.maintenance_interval_hours,
    next_maintenance_at_hours: printer.next_maintenance_at_hours,
    notes: printer.notes,
    active: true,
  });

  if (error) return { ok: false, message: error.message };
  revalidatePath("/impressoras");
  return { ok: true, message: "Impressora duplicada." };
}

export async function deletePrinterAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };

  const { error } = await supabase
    .from("printers")
    .update({ active: false, status: "inactive" })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/impressoras");
  return { ok: true, message: "Impressora excluida." };
}

export async function createProductAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  const productData = parsed.data;
  const pricingContext = await getProductPricingContext(supabase, organizationId, parsed.data.printer_id);
  if (!pricingContext.ok) return { ok: false, message: pricingContext.message };

  const filaments = JSON.parse(value(formData, "filaments") || "[]") as Array<{ filament_id: string; weight_grams: number; cost_per_gram: number }>;
  const supplies = JSON.parse(value(formData, "supplies") || "[]") as Array<{ supply_id: string; quantity: number; unit_cost: number }>;
  const partNames = parsePartNames(formData);
  const partDetails = parsePartDetails(formData);
  const pricing = calculatePricing({
    filaments: filaments.map((item) => ({ weightGrams: item.weight_grams, costPerGram: item.cost_per_gram })),
    supplies: supplies.map((item) => ({ quantity: item.quantity, unitCost: item.unit_cost })),
    printTimeMinutes: parsed.data.print_time_minutes,
    batchQuantity: parsed.data.batch_quantity,
    packagingCost: parsed.data.packaging_cost,
    fixedLaborCost: parsed.data.fixed_labor_cost,
    laborTimeMinutes: parsed.data.labor_time_minutes,
    laborCostPerHour: pricingContext.settings.default_labor_cost_per_hour,
    machineCostPerHour: pricingContext.printer.machine_cost_per_hour,
    energyCostPerKwh: pricingContext.settings.energy_cost_per_kwh,
    printerPowerWatts: pricingContext.printer.power_watts,
    wastePercentage: pricingContext.settings.default_waste_percentage,
    markup: pricingContext.settings.default_markup,
  });

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      ...productData,
      organization_id: organizationId,
      printer_id: parsed.data.printer_id || null,
      sku: optionalText(parsed.data.sku),
      category: optionalText(parsed.data.category),
      description: buildProductDescription(optionalText(parsed.data.description), partDetails.length ? partDetails : partNames),
      image_url: parsed.data.image_url || null,
      manual_sale_price: optionalNumber(parsed.data.manual_sale_price, { zeroAsNull: true }),
      machine_cost_per_hour: pricingContext.printer.machine_cost_per_hour,
      energy_cost_per_kwh: pricingContext.settings.energy_cost_per_kwh,
      printer_power_watts: pricingContext.printer.power_watts,
      waste_percentage: pricingContext.settings.default_waste_percentage,
      desired_markup: pricingContext.settings.default_markup,
      calculated_cost: pricing.totalBatchCost,
      calculated_unit_cost: pricing.unitCost,
      calculated_sale_price: pricing.suggestedUnitPrice,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  if (filaments.length) {
    await supabase.from("product_filaments").insert(
      filaments.map((item) => ({
        organization_id: organizationId,
        product_id: product.id,
        filament_id: item.filament_id,
        weight_grams: item.weight_grams,
      })),
    );
  }
  if (supplies.length) {
    await supabase.from("product_supplies").insert(
      supplies.map((item) => ({
        organization_id: organizationId,
        product_id: product.id,
        supply_id: item.supply_id,
        quantity: item.quantity,
      })),
    );
  }

  revalidatePath("/produtos");
  return { ok: true, message: "Produto salvo." };
}

export async function updateProductAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Produto nao encontrado." };
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  const productData = parsed.data;
  const pricingContext = await getProductPricingContext(supabase, profile.organization_id, parsed.data.printer_id);
  if (!pricingContext.ok) return { ok: false, message: pricingContext.message };
  const { data: currentProduct, error: currentProductError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (currentProductError) return { ok: false, message: currentProductError.message };
  const partNames = parsePartNames(formData);
  const partDetails = parsePartDetails(formData);
  const nextParts = partDetails.length ? partDetails : (partNames.length ? partNames.map((name) => ({ name })) : getProductParts(currentProduct));
  const filaments = JSON.parse(value(formData, "filaments") || "[]") as Array<{ filament_id: string; weight_grams: number }>;
  const validFilaments = filaments.filter((item) => item.filament_id && Number(item.weight_grams) > 0);
  const supplies = JSON.parse(value(formData, "supplies") || "[]") as Array<{ supply_id: string; quantity: number; unit_cost?: number }>;
  const validSupplies = supplies.filter((item) => item.supply_id && Number(item.quantity) > 0);

  const [deleteFilamentsResult, deleteSuppliesResult] = await Promise.all([
    supabase.from("product_filaments").delete().eq("product_id", id).eq("organization_id", profile.organization_id),
    supabase.from("product_supplies").delete().eq("product_id", id).eq("organization_id", profile.organization_id),
  ]);
  if (deleteFilamentsResult.error) return { ok: false, message: deleteFilamentsResult.error.message };
  const deleteSuppliesError = deleteSuppliesResult.error;
  if (deleteSuppliesError) return { ok: false, message: deleteSuppliesError.message };
  if (validFilaments.length) {
    const { error: insertFilamentsError } = await supabase.from("product_filaments").insert(
      validFilaments.map((item) => ({
        organization_id: profile.organization_id!,
        product_id: id,
        filament_id: item.filament_id,
        weight_grams: Number(item.weight_grams),
      })),
    );
    if (insertFilamentsError) return { ok: false, message: insertFilamentsError.message };
  }
  if (validSupplies.length) {
    const { error: insertSuppliesError } = await supabase.from("product_supplies").insert(
      validSupplies.map((item) => ({
        organization_id: profile.organization_id!,
        product_id: id,
        supply_id: item.supply_id,
        quantity: Number(item.quantity),
      })),
    );
    if (insertSuppliesError) return { ok: false, message: insertSuppliesError.message };
  }
  const pricing = await buildStoredProductPricing(
    supabase,
    { ...currentProduct, ...productData, printer_id: parsed.data.printer_id },
    pricingContext.settings,
  );
  if (!pricing) return { ok: false, message: "Nao foi possivel recalcular o produto." };

  const { error } = await supabase
    .from("products")
    .update({
      ...productData,
      printer_id: parsed.data.printer_id || null,
      sku: optionalText(parsed.data.sku),
      category: optionalText(parsed.data.category),
      description: buildProductDescription(optionalText(parsed.data.description), nextParts),
      image_url: parsed.data.image_url || null,
      manual_sale_price: optionalNumber(parsed.data.manual_sale_price, { zeroAsNull: true }),
      ...pricing,
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return { ok: true, message: "Produto atualizado." };
}

export async function duplicateProductAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const { data: product, error: readError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (readError) return { ok: false, message: readError.message };

  const { data: created, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      name: `${product.name} (copia)`,
      sku: null,
      category: product.category,
      description: buildProductDescription(getProductPublicDescription(product), getProductParts(product)),
      image_url: product.image_url,
      printer_id: product.printer_id,
      print_time_minutes: product.print_time_minutes,
      batch_quantity: product.batch_quantity,
      packaging_cost: product.packaging_cost,
      fixed_labor_cost: product.fixed_labor_cost,
      labor_time_minutes: product.labor_time_minutes,
      machine_cost_per_hour: product.machine_cost_per_hour,
      energy_cost_per_kwh: product.energy_cost_per_kwh,
      printer_power_watts: product.printer_power_watts,
      waste_percentage: product.waste_percentage,
      desired_markup: product.desired_markup,
      manual_sale_price: product.manual_sale_price,
      calculated_cost: product.calculated_cost,
      calculated_unit_cost: product.calculated_unit_cost,
      calculated_sale_price: product.calculated_sale_price,
      finished_stock_quantity: 0,
      minimum_finished_stock: product.minimum_finished_stock,
      active: true,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };

  const [filaments, supplies] = await Promise.all([
    supabase.from("product_filaments").select("*").eq("product_id", id),
    supabase.from("product_supplies").select("*").eq("product_id", id),
  ]);
  if (filaments.data?.length) {
    await supabase.from("product_filaments").insert(
      filaments.data.map((item) => ({
        organization_id: organizationId,
        product_id: created.id,
        filament_id: item.filament_id,
        weight_grams: item.weight_grams,
      })),
    );
  }
  if (supplies.data?.length) {
    await supabase.from("product_supplies").insert(
      supplies.data.map((item) => ({
        organization_id: organizationId,
        product_id: created.id,
        supply_id: item.supply_id,
        quantity: item.quantity,
      })),
    );
  }

  revalidatePath("/produtos");
  return { ok: true, message: "Produto duplicado." };
}

export async function deleteProductAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return { ok: true, message: "Produto excluido." };
}

export async function createProductionOrderAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = productionOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  const orderFilaments = parseOrderFilaments(formData);
  if (!orderFilaments.length) return { ok: false, message: "Selecione pelo menos um filamento para produzir." };

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", parsed.data.product_id)
    .single();
  if (productError) return { ok: false, message: productError.message };

  const filamentIds = orderFilaments.map((line) => line.filament_id);
  const { data: filaments, error: filamentError } = await supabase
    .from("filaments")
    .select("id, cost_per_gram")
    .eq("organization_id", organizationId)
    .in("id", filamentIds);
  if (filamentError) return { ok: false, message: filamentError.message };
  const costByFilament = new Map((filaments ?? []).map((filament) => [filament.id, filament.cost_per_gram]));
  const materialCost = orderFilaments.reduce((total, line) => total + line.weight_grams * line.quantity * (costByFilament.get(line.filament_id) ?? 0), 0);
  const estimatedMinutes = orderFilaments.reduce((total, line) => total + line.print_time_minutes, 0) || product.print_time_minutes * parsed.data.planned_quantity;
  const partNotes = orderFilaments.map((line, index) => `${index + 1}. ${line.part_name}: ${line.quantity} un x ${line.weight_grams}g`).join("; ");
  const orderNotes = [optionalText(parsed.data.notes), partNotes ? `Partes: ${partNotes}` : null].filter(Boolean).join("\n");
  const orderNumber = `OP-${Date.now().toString().slice(-8)}`;
  const { data: order, error } = await supabase.from("production_orders").insert({
    organization_id: organizationId,
    order_number: orderNumber,
    product_id: parsed.data.product_id,
    printer_id: parsed.data.printer_id || product.printer_id,
    planned_quantity: parsed.data.planned_quantity,
    status: parsed.data.status,
    planned_start_at: parsed.data.planned_start_at || null,
    estimated_minutes: estimatedMinutes,
    estimated_material_cost: materialCost,
    estimated_total_cost: product.calculated_cost * parsed.data.planned_quantity + materialCost,
    notes: orderNotes || null,
    created_by: user.id,
  }).select("id").single();
  if (error) return { ok: false, message: error.message };
  const orderFilamentPayload = orderFilaments.map((line) => {
    const plannedWeight = line.weight_grams * line.quantity;
    const unitCost = costByFilament.get(line.filament_id) ?? 0;
    return {
      organization_id: organizationId,
      production_order_id: order.id,
      filament_id: line.filament_id,
      planned_weight_grams: plannedWeight,
      actual_weight_grams: plannedWeight,
      wasted_weight_grams: 0,
      unit_cost_snapshot: unitCost,
      total_cost: plannedWeight * unitCost,
    };
  });
  const { error: orderFilamentsError } = await supabase.from("production_order_filaments").insert(orderFilamentPayload);
  if (orderFilamentsError) return { ok: false, message: orderFilamentsError.message };
  revalidatePath("/producao");
  return { ok: true, message: "Ordem criada." };
}

export async function updateProductionOrderAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Ordem nao encontrada." };
  const parsed = productionOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { data: product, error: productError } = await supabase.from("products").select("*").eq("id", parsed.data.product_id).single();
  if (productError) return { ok: false, message: productError.message };

  const { error } = await supabase
    .from("production_orders")
    .update({
      product_id: parsed.data.product_id,
      printer_id: parsed.data.printer_id || product.printer_id,
      planned_quantity: parsed.data.planned_quantity,
      status: parsed.data.status,
      planned_start_at: parsed.data.planned_start_at || null,
      estimated_minutes: product.print_time_minutes,
      estimated_material_cost: product.calculated_cost,
      estimated_total_cost: product.calculated_cost,
      notes: optionalText(parsed.data.notes),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/producao");
  return { ok: true, message: "Ordem atualizada." };
}

export async function duplicateProductionOrderAction(id: string): Promise<MutationResult> {
  const { supabase, profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { data: order, error: readError } = await supabase
    .from("production_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (readError) return { ok: false, message: readError.message };

  const { data: created, error } = await supabase.from("production_orders").insert({
    organization_id: profile.organization_id,
    order_number: `OP-${Date.now().toString().slice(-8)}`,
    product_id: order.product_id,
    printer_id: order.printer_id,
    planned_quantity: order.planned_quantity,
    status: "draft",
    planned_start_at: order.planned_start_at,
    estimated_minutes: order.estimated_minutes,
    estimated_material_cost: order.estimated_material_cost,
    estimated_total_cost: order.estimated_total_cost,
    notes: order.notes,
    created_by: user.id,
  }).select("id").single();
  if (error) return { ok: false, message: error.message };

  const { data: filaments } = await supabase.from("production_order_filaments").select("*").eq("production_order_id", id);
  if (filaments?.length) {
    await supabase.from("production_order_filaments").insert(
      filaments.map((line) => ({
        organization_id: profile.organization_id!,
        production_order_id: created.id,
        filament_id: line.filament_id,
        planned_weight_grams: line.planned_weight_grams,
        actual_weight_grams: line.actual_weight_grams,
        wasted_weight_grams: line.wasted_weight_grams,
        unit_cost_snapshot: line.unit_cost_snapshot,
        total_cost: line.total_cost,
      })),
    );
  }

  revalidatePath("/producao");
  return { ok: true, message: "Ordem duplicada." };
}

export async function deleteProductionOrderAction(id: string): Promise<MutationResult> {
  const { supabase, profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const admin = createAdminClient();
  const { data: order, error: readError } = await supabase
    .from("production_orders")
    .select("*")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (readError) return { ok: false, message: readError.message };

  const [filamentMovements, supplyMovements, productMovements] = await Promise.all([
    admin
      .from("filament_movements")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("reference_type", "production_order")
      .eq("reference_id", id),
    admin
      .from("supply_movements")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("reference_type", "production_order")
      .eq("reference_id", id),
    admin
      .from("finished_product_movements")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .eq("reference_type", "production_order")
      .eq("reference_id", id),
  ]);

  if (filamentMovements.error) return { ok: false, message: filamentMovements.error.message };
  if (supplyMovements.error) return { ok: false, message: supplyMovements.error.message };
  if (productMovements.error) return { ok: false, message: productMovements.error.message };

  const alreadyReversed =
    (filamentMovements.data ?? []).some((movement) => movement.movement_type === "return" && movement.quantity > 0) ||
    (supplyMovements.data ?? []).some((movement) => movement.movement_type === "return" && movement.quantity > 0) ||
    (supplyMovements.data ?? []).some((movement) => movement.movement_type === "cancellation" && movement.quantity < 0) ||
    (productMovements.data ?? []).some((movement) => movement.movement_type === "cancellation" && movement.quantity < 0);

  if (order.status === "cancelled" && alreadyReversed) return { ok: true, message: "Ordem ja cancelada com estoque estornado." };

  for (const movement of supplyMovements.data ?? []) {
    if (movement.movement_type !== "production_output" || movement.quantity <= 0) continue;
    const { data: supply, error: supplyError } = await admin
      .from("inventory_supplies")
      .select("name,current_quantity")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (supplyError) return { ok: false, message: supplyError.message };
    if (supply.current_quantity - movement.quantity < 0) return { ok: false, message: `Nao da para cancelar: ${supply.name} ja foi usado.` };
  }

  for (const movement of productMovements.data ?? []) {
    if (movement.movement_type !== "production_output" || movement.quantity <= 0) continue;
    const { data: product, error: productError } = await admin
      .from("products")
      .select("name,finished_stock_quantity")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (productError) return { ok: false, message: productError.message };
    if (product.finished_stock_quantity - movement.quantity < 0) return { ok: false, message: `Nao da para cancelar: ${product.name} ja saiu do estoque.` };
  }

  for (const movement of filamentMovements.data ?? []) {
    if (movement.quantity >= 0 || movement.movement_type === "return") continue;
    const { data: filament, error: filamentError } = await admin
      .from("filaments")
      .select("*")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (filamentError) return { ok: false, message: filamentError.message };
    const returnQuantity = Math.abs(movement.quantity);
    const newBalance = filament.current_weight_grams + returnQuantity;
    const { error: updateFilamentError } = await admin.from("filaments").update({ current_weight_grams: newBalance }).eq("id", filament.id);
    if (updateFilamentError) return { ok: false, message: updateFilamentError.message };
    const { error: insertFilamentMovementError } = await admin.from("filament_movements").insert({
      organization_id: profile.organization_id,
      item_id: filament.id,
      movement_type: "return",
      quantity: returnQuantity,
      previous_balance: filament.current_weight_grams,
      new_balance: newBalance,
      unit_cost: movement.unit_cost,
      total_cost: returnQuantity * movement.unit_cost,
      reference_type: "production_order",
      reference_id: id,
      notes: `Estorno do cancelamento de ${order.order_number}`,
      created_by: user.id,
    });
    if (insertFilamentMovementError) return { ok: false, message: insertFilamentMovementError.message };
  }

  for (const movement of supplyMovements.data ?? []) {
    if (movement.movement_type !== "production_output" || movement.quantity <= 0) continue;
    const { data: supply, error: supplyError } = await admin
      .from("inventory_supplies")
      .select("*")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (supplyError) return { ok: false, message: supplyError.message };
    const newBalance = supply.current_quantity - movement.quantity;
    if (newBalance < 0) return { ok: false, message: `Nao da para cancelar: ${supply.name} ja foi usado.` };
    const { error: updateSupplyError } = await admin.from("inventory_supplies").update({ current_quantity: newBalance }).eq("id", supply.id);
    if (updateSupplyError) return { ok: false, message: updateSupplyError.message };
    const { error: insertSupplyMovementError } = await admin.from("supply_movements").insert({
      organization_id: profile.organization_id,
      item_id: supply.id,
      movement_type: "cancellation",
      quantity: -movement.quantity,
      previous_balance: supply.current_quantity,
      new_balance: newBalance,
      unit_cost: movement.unit_cost,
      total_cost: movement.quantity * movement.unit_cost,
      reference_type: "production_order",
      reference_id: id,
      notes: `Estorno do cancelamento de ${order.order_number}`,
      created_by: user.id,
    });
    if (insertSupplyMovementError) return { ok: false, message: insertSupplyMovementError.message };
  }

  for (const movement of supplyMovements.data ?? []) {
    if (movement.movement_type !== "production_consumption" || movement.quantity >= 0) continue;
    const { data: supply, error: supplyError } = await admin
      .from("inventory_supplies")
      .select("*")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (supplyError) return { ok: false, message: supplyError.message };
    const returnQuantity = Math.abs(movement.quantity);
    const newBalance = supply.current_quantity + returnQuantity;
    const { error: updateSupplyError } = await admin.from("inventory_supplies").update({ current_quantity: newBalance }).eq("id", supply.id);
    if (updateSupplyError) return { ok: false, message: updateSupplyError.message };
    const { error: insertSupplyMovementError } = await admin.from("supply_movements").insert({
      organization_id: profile.organization_id,
      item_id: supply.id,
      movement_type: "return",
      quantity: returnQuantity,
      previous_balance: supply.current_quantity,
      new_balance: newBalance,
      unit_cost: movement.unit_cost,
      total_cost: returnQuantity * movement.unit_cost,
      reference_type: "production_order",
      reference_id: id,
      notes: `Estorno do cancelamento de ${order.order_number}`,
      created_by: user.id,
    });
    if (insertSupplyMovementError) return { ok: false, message: insertSupplyMovementError.message };
  }

  for (const movement of productMovements.data ?? []) {
    if (movement.movement_type !== "production_output" || movement.quantity <= 0) continue;
    const { data: product, error: productError } = await admin
      .from("products")
      .select("*")
      .eq("id", movement.item_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (productError) return { ok: false, message: productError.message };
    const newBalance = product.finished_stock_quantity - movement.quantity;
    if (newBalance < 0) return { ok: false, message: `Nao da para cancelar: ${product.name} ja saiu do estoque.` };
    const { error: updateProductError } = await admin.from("products").update({ finished_stock_quantity: newBalance }).eq("id", product.id);
    if (updateProductError) return { ok: false, message: updateProductError.message };
    const { error: insertProductMovementError } = await admin.from("finished_product_movements").insert({
      organization_id: profile.organization_id,
      item_id: product.id,
      movement_type: "cancellation",
      quantity: -movement.quantity,
      previous_balance: product.finished_stock_quantity,
      new_balance: newBalance,
      unit_cost: movement.unit_cost,
      total_cost: movement.quantity * movement.unit_cost,
      reference_type: "production_order",
      reference_id: id,
      notes: `Estorno do cancelamento de ${order.order_number}`,
      created_by: user.id,
    });
    if (insertProductMovementError) return { ok: false, message: insertProductMovementError.message };
  }

  const { error } = await admin
    .from("production_orders")
    .update({ status: "cancelled", notes: [order.notes, "Ordem cancelada com estorno de estoque."].filter(Boolean).join("\n") })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/producao");
  revalidatePath("/filamentos");
  revalidatePath("/componentes");
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  revalidatePath("/movimentacoes");
  return { ok: true, message: "Ordem cancelada com estoque estornado." };
}

export async function startProductionOrderAction(orderId: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { data: order, error: readError } = await supabase
    .from("production_orders")
    .select("*")
    .eq("id", orderId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (readError) return { ok: false, message: readError.message };
  if (order.status === "printing") return { ok: true, message: "Ordem ja iniciada." };
  if (["completed", "failed", "cancelled"].includes(order.status)) return { ok: false, message: "Ordem encerrada nao pode ser iniciada." };

  const { error } = await supabase
    .from("production_orders")
    .update({ status: "printing", started_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };
  if (order.printer_id) await supabase.from("printers").update({ status: "printing" }).eq("id", order.printer_id).eq("organization_id", profile.organization_id);
  revalidatePath("/producao");
  return { ok: true, message: "Producao iniciada." };
}

export async function finishProductionOrderAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const admin = createAdminClient();
  const orderId = value(formData, "order_id");
  const printedPartOutputs = parsePrintedPartOutputs(formData);
  const wantsPrintedPartOutput = value(formData, "output_mode") === "printed_part";
  let producedQuantity = Number(value(formData, "produced_quantity"));
  let failedQuantity = Number(value(formData, "failed_quantity"));
  if (wantsPrintedPartOutput && printedPartOutputs.length) {
    producedQuantity = printedPartOutputs.reduce((sum, line) => sum + line.produced_quantity, 0);
    failedQuantity = printedPartOutputs.reduce((sum, line) => sum + line.failed_quantity, 0);
  }
  const actualMinutes = Number(value(formData, "actual_minutes"));
  const notes = optionalText(value(formData, "notes"));
  const outputSupplyId = value(formData, "output_supply_id");
  const outputMode = wantsPrintedPartOutput ? "printed_part" : "finished_product";
  if (!orderId || producedQuantity < 0 || failedQuantity < 0 || actualMinutes < 0) return { ok: false, message: "Valores invalidos." };
  if (producedQuantity + failedQuantity <= 0) return { ok: false, message: "Informe ao menos uma unidade produzida ou falha." };
  if (outputMode === "printed_part" && !printedPartOutputs.length && !outputSupplyId) return { ok: false, message: "Selecione qual parte impressa entrou no estoque." };
  if (printedPartOutputs.some((line) => line.produced_quantity < 0 || line.failed_quantity < 0)) return { ok: false, message: "Quantidade de parte invalida." };

  const { data: order, error: orderError } = await supabase
    .from("production_orders")
    .select("*")
    .eq("id", orderId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (orderError) return { ok: false, message: orderError.message };
  if (["completed", "failed", "cancelled"].includes(order.status)) return { ok: true, message: "Ordem ja finalizada." };

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", order.product_id)
    .eq("organization_id", profile.organization_id)
    .single();
  if (productError) return { ok: false, message: productError.message };

  const { data: orderFilaments, error: orderFilamentsError } = await supabase
    .from("production_order_filaments")
    .select("*")
    .eq("production_order_id", order.id)
    .eq("organization_id", profile.organization_id);
  if (orderFilamentsError) return { ok: false, message: orderFilamentsError.message };
  if (!orderFilaments?.length) return { ok: false, message: "Ordem sem filamento selecionado." };

  const finishedProductComponentLines: Array<{
    supply: {
      id: string;
      name: string;
      category: string;
      current_quantity: number;
      unit_cost: number;
    };
    quantity: number;
  }> = [];
  const finishedProductLeftoverPartLines: Array<{
    supply: {
      id: string;
      name: string;
      current_quantity: number;
      unit_cost: number;
    };
    quantity: number;
    totalWeightGrams: number;
    partKey: string;
  }> = [];
  if (outputMode === "finished_product" && producedQuantity > 0) {
    const { data: productSupplies, error: productSuppliesError } = await supabase
      .from("product_supplies")
      .select("*")
      .eq("product_id", product.id)
      .eq("organization_id", profile.organization_id);
    if (productSuppliesError) return { ok: false, message: productSuppliesError.message };
    const supplyIds = (productSupplies ?? []).map((line) => line.supply_id);
    if (supplyIds.length) {
      const { data: supplies, error: suppliesError } = await admin
        .from("inventory_supplies")
        .select("id,name,category,current_quantity,unit_cost")
        .eq("organization_id", profile.organization_id)
        .in("id", supplyIds);
      if (suppliesError) return { ok: false, message: suppliesError.message };
      const supplyById = new Map((supplies ?? []).map((supply) => [supply.id, supply]));
      const partGroups = parseOrderPartGroupsFromNotes(order.notes);
      const partGroupByKey = new Map(partGroups.map((group) => [normalizeSearch(group.key), group]));
      for (const line of productSupplies ?? []) {
        const supply = supplyById.get(line.supply_id);
        if (!supply) continue;
        if (supply.category === "parte impressa") {
          const supplySearch = normalizeSearch(supply.name);
          const partGroup = partGroups.find((group) => supplySearch.includes(normalizeSearch(group.key))) ?? partGroupByKey.get(normalizeSearch(supply.name));
          if (!partGroup) continue;
          const requiredForFinished = line.quantity * producedQuantity;
          if (requiredForFinished > partGroup.quantity) {
            return { ok: false, message: `A ordem gerou ${partGroup.quantity} de ${partGroup.key}, mas ${producedQuantity} produtos precisam de ${requiredForFinished}.` };
          }
          const leftoverQuantity = partGroup.quantity - requiredForFinished;
          if (leftoverQuantity > 0) {
            finishedProductLeftoverPartLines.push({
              supply,
              quantity: leftoverQuantity,
              totalWeightGrams: partGroup.totalWeightGrams * (leftoverQuantity / partGroup.quantity),
              partKey: partGroup.key,
            });
          }
          continue;
        }
        const requiredQuantity = line.quantity * producedQuantity;
        if (supply.current_quantity < requiredQuantity) return { ok: false, message: `Estoque insuficiente: ${supply.name}.` };
        finishedProductComponentLines.push({ supply, quantity: requiredQuantity });
      }
    }
  }

  let actualMaterialCost = 0;
  const failureNote = failedQuantity > 0 ? `${failedQuantity} unidade(s) perdida(s) nesta producao.` : "";
  const finalNotes = [notes, failureNote].filter(Boolean).join(" ");
  for (const line of orderFilaments) {
    const { data: filament, error: filamentError } = await admin
      .from("filaments")
      .select("*")
      .eq("id", line.filament_id)
      .eq("organization_id", profile.organization_id)
      .single();
    if (filamentError) return { ok: false, message: filamentError.message };
    const weight = line.actual_weight_grams || line.planned_weight_grams;
    const newBalance = filament.current_weight_grams - weight;
    if (newBalance < 0) return { ok: false, message: `Estoque insuficiente: ${filament.name}.` };
    const totalCost = weight * line.unit_cost_snapshot;
    actualMaterialCost += totalCost;
    await admin.from("filaments").update({ current_weight_grams: newBalance }).eq("id", filament.id);
    await admin.from("production_order_filaments").update({ actual_weight_grams: weight, total_cost: totalCost }).eq("id", line.id);
    await admin.from("filament_movements").insert({
      organization_id: profile.organization_id,
      item_id: filament.id,
      movement_type: "production_consumption",
      quantity: -weight,
      previous_balance: filament.current_weight_grams,
      new_balance: newBalance,
      unit_cost: line.unit_cost_snapshot,
      total_cost: totalCost,
      reference_type: "production_order",
      reference_id: order.id,
      notes: finalNotes || null,
      created_by: user.id,
    });
  }

  const actualWeightTotal = orderFilaments.reduce((sum, line) => sum + (line.actual_weight_grams || line.planned_weight_grams), 0);

  if (producedQuantity > 0 && outputMode === "finished_product") {
    const newProductBalance = product.finished_stock_quantity + producedQuantity;
    await admin.from("products").update({ finished_stock_quantity: newProductBalance }).eq("id", product.id);
    await admin.from("finished_product_movements").insert({
      organization_id: profile.organization_id,
      item_id: product.id,
      movement_type: "production_output",
      quantity: producedQuantity,
      previous_balance: product.finished_stock_quantity,
      new_balance: newProductBalance,
      unit_cost: product.calculated_unit_cost,
      total_cost: producedQuantity * product.calculated_unit_cost,
      reference_type: "production_order",
      reference_id: order.id,
      notes: finalNotes || null,
      created_by: user.id,
    });

    for (const line of finishedProductComponentLines) {
      const newSupplyBalance = line.supply.current_quantity - line.quantity;
      const { error: updateSupplyError } = await admin
        .from("inventory_supplies")
        .update({ current_quantity: newSupplyBalance })
        .eq("id", line.supply.id);
      if (updateSupplyError) return { ok: false, message: updateSupplyError.message };
      const { error: supplyMovementError } = await admin.from("supply_movements").insert({
        organization_id: profile.organization_id,
        item_id: line.supply.id,
        movement_type: "production_consumption",
        quantity: -line.quantity,
        previous_balance: line.supply.current_quantity,
        new_balance: newSupplyBalance,
        unit_cost: line.supply.unit_cost,
        total_cost: line.quantity * line.supply.unit_cost,
        reference_type: "production_order",
        reference_id: order.id,
        notes: finalNotes || `Componente usado em ${product.name}`,
        created_by: user.id,
      });
      if (supplyMovementError) return { ok: false, message: supplyMovementError.message };
    }

    for (const line of finishedProductLeftoverPartLines) {
      const unitCost = line.quantity > 0 && actualWeightTotal > 0 ? (actualMaterialCost * (line.totalWeightGrams / actualWeightTotal)) / line.quantity : line.supply.unit_cost;
      const totalCost = unitCost * line.quantity;
      const newSupplyBalance = line.supply.current_quantity + line.quantity;
      const currentStockValue = line.supply.current_quantity * line.supply.unit_cost;
      const newStockValue = currentStockValue + totalCost;
      const { error: updateSupplyError } = await admin
        .from("inventory_supplies")
        .update({ current_quantity: newSupplyBalance, purchase_quantity: Math.max(newSupplyBalance, 1), purchase_price: newStockValue })
        .eq("id", line.supply.id);
      if (updateSupplyError) return { ok: false, message: updateSupplyError.message };
      const { error: supplyMovementError } = await admin.from("supply_movements").insert({
        organization_id: profile.organization_id,
        item_id: line.supply.id,
        movement_type: "production_output",
        quantity: line.quantity,
        previous_balance: line.supply.current_quantity,
        new_balance: newSupplyBalance,
        unit_cost: unitCost,
        total_cost: totalCost,
        reference_type: "production_order",
        reference_id: order.id,
        notes: finalNotes || `Sobra de ${line.partKey} em ${product.name}`,
        created_by: user.id,
      });
      if (supplyMovementError) return { ok: false, message: supplyMovementError.message };
    }
  }

  const printedPartLossCost = outputMode === "printed_part" && printedPartOutputs.length
    ? printedPartOutputs.reduce((sum, line) => {
        const groupCost = actualWeightTotal > 0 ? actualMaterialCost * (line.total_weight_grams / actualWeightTotal) : 0;
        const totalParts = line.produced_quantity + line.failed_quantity;
        return sum + (totalParts > 0 ? groupCost * (line.failed_quantity / totalParts) : 0);
      }, 0)
    : null;

  if (outputMode === "printed_part") {
    const outputs = printedPartOutputs.length
      ? printedPartOutputs
      : [{ name: "Parte impressa", supply_id: outputSupplyId, produced_quantity: producedQuantity, failed_quantity: failedQuantity, total_weight_grams: actualWeightTotal }];
    for (const output of outputs) {
      if (output.produced_quantity <= 0) continue;
      const { data: supply, error: supplyError } = await admin
        .from("inventory_supplies")
        .select("*")
        .eq("id", output.supply_id)
        .eq("organization_id", profile.organization_id)
        .single();
      if (supplyError) return { ok: false, message: supplyError.message };
      const groupCost = actualWeightTotal > 0 ? actualMaterialCost * (output.total_weight_grams / actualWeightTotal) : actualMaterialCost;
      const totalParts = output.produced_quantity + output.failed_quantity;
      const producedCost = totalParts > 0 ? groupCost * (output.produced_quantity / totalParts) : groupCost;
      const unitCost = output.produced_quantity > 0 ? producedCost / output.produced_quantity : supply.unit_cost;
      const newSupplyBalance = supply.current_quantity + output.produced_quantity;
      const currentStockValue = supply.current_quantity * supply.unit_cost;
      const newStockValue = currentStockValue + producedCost;
      const { error: updateSupplyError } = await admin
        .from("inventory_supplies")
        .update({ current_quantity: newSupplyBalance, purchase_quantity: Math.max(newSupplyBalance, 1), purchase_price: newStockValue })
        .eq("id", supply.id);
      if (updateSupplyError) return { ok: false, message: updateSupplyError.message };
      const { error: supplyMovementError } = await admin.from("supply_movements").insert({
        organization_id: profile.organization_id,
        item_id: supply.id,
        movement_type: "production_output",
        quantity: output.produced_quantity,
        previous_balance: supply.current_quantity,
        new_balance: newSupplyBalance,
        unit_cost: unitCost,
        total_cost: producedCost,
        reference_type: "production_order",
        reference_id: order.id,
        notes: finalNotes || `${output.name} produzida para ${product.name}`,
        created_by: user.id,
      });
      if (supplyMovementError) return { ok: false, message: supplyMovementError.message };
    }
  }

  if (failedQuantity > 0) {
    const totalUnits = producedQuantity + failedQuantity;
    const lossCost = printedPartLossCost ?? (totalUnits > 0 ? actualMaterialCost * (failedQuantity / totalUnits) : actualMaterialCost);
    const productBalanceAfterOutput = outputMode === "finished_product" ? product.finished_stock_quantity + producedQuantity : product.finished_stock_quantity;
    const { error: lossError } = await admin.from("finished_product_movements").insert({
      organization_id: profile.organization_id,
      item_id: product.id,
      movement_type: "loss",
      quantity: failedQuantity,
      previous_balance: productBalanceAfterOutput,
      new_balance: productBalanceAfterOutput,
      unit_cost: failedQuantity > 0 ? lossCost / failedQuantity : 0,
      total_cost: lossCost,
      reference_type: "production_order",
      reference_id: order.id,
      notes: finalNotes || null,
      created_by: user.id,
    });
    if (lossError) return { ok: false, message: lossError.message };
  }

  await admin.from("production_orders").update({
    status: producedQuantity > 0 ? "completed" : "failed",
    produced_quantity: producedQuantity,
    failed_quantity: failedQuantity,
    actual_minutes: actualMinutes,
    actual_material_cost: actualMaterialCost,
    actual_total_cost: Math.max(actualMaterialCost, order.estimated_total_cost),
    finished_at: new Date().toISOString(),
    notes: finalNotes || order.notes,
  }).eq("id", order.id);
  if (order.printer_id) {
    const { data: printer } = await admin.from("printers").select("total_printed_hours").eq("id", order.printer_id).single();
    if (printer) {
      await admin
        .from("printers")
        .update({ status: "available", total_printed_hours: printer.total_printed_hours + actualMinutes / 60 })
        .eq("id", order.printer_id);
    }
  }
  revalidatePath("/producao");
  revalidatePath("/estoque");
  return { ok: true, message: "Ordem finalizada com estoque atualizado." };
}

export async function assembleProductAction(formData: FormData): Promise<MutationResult> {
  const { profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const productId = value(formData, "product_id");
  const quantity = Number(value(formData, "quantity"));
  const notes = optionalText(value(formData, "notes"));
  const lines = parseAssemblySupplies(formData);
  if (!productId || !Number.isInteger(quantity) || quantity <= 0) return { ok: false, message: "Informe produto e quantidade de montagem." };
  if (!lines.length) return { ok: false, message: "Adicione as partes/componentes da montagem." };

  const admin = createAdminClient();
  const { data: product, error: productError } = await admin
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .single();
  if (productError) return { ok: false, message: productError.message };

  let totalConsumedCost = 0;
  for (const line of lines) {
    const requiredQuantity = line.quantity * quantity;
    const { data: supply, error: supplyError } = await admin
      .from("inventory_supplies")
      .select("*")
      .eq("id", line.supply_id)
      .eq("organization_id", organizationId)
      .eq("active", true)
      .single();
    if (supplyError) return { ok: false, message: supplyError.message };
    const newBalance = supply.current_quantity - requiredQuantity;
    if (newBalance < 0) return { ok: false, message: `Estoque insuficiente: ${supply.name}.` };
    const totalCost = requiredQuantity * supply.unit_cost;
    totalConsumedCost += totalCost;
    const { error: updateError } = await admin.from("inventory_supplies").update({ current_quantity: newBalance }).eq("id", supply.id);
    if (updateError) return { ok: false, message: updateError.message };
    const { error: movementError } = await admin.from("supply_movements").insert({
      organization_id: organizationId,
      item_id: supply.id,
      movement_type: "production_consumption",
      quantity: -requiredQuantity,
      previous_balance: supply.current_quantity,
      new_balance: newBalance,
      unit_cost: supply.unit_cost,
      total_cost: totalCost,
      reference_type: "assembly",
      reference_id: product.id,
      notes: notes ?? `Montagem de ${product.name}`,
      created_by: user.id,
    });
    if (movementError) return { ok: false, message: movementError.message };
  }

  const newProductBalance = product.finished_stock_quantity + quantity;
  const unitCost = quantity > 0 ? totalConsumedCost / quantity : product.calculated_unit_cost;
  const { error: updateProductError } = await admin.from("products").update({ finished_stock_quantity: newProductBalance }).eq("id", product.id);
  if (updateProductError) return { ok: false, message: updateProductError.message };
  const { error: productMovementError } = await admin.from("finished_product_movements").insert({
    organization_id: organizationId,
    item_id: product.id,
    movement_type: "production_output",
    quantity,
    previous_balance: product.finished_stock_quantity,
    new_balance: newProductBalance,
    unit_cost: unitCost,
    total_cost: totalConsumedCost,
    reference_type: "assembly",
    reference_id: product.id,
    notes,
    created_by: user.id,
  });
  if (productMovementError) return { ok: false, message: productMovementError.message };

  revalidatePath("/producao");
  revalidatePath("/componentes");
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  revalidatePath("/movimentacoes");
  return { ok: true, message: "Produto montado e estoque atualizado." };
}

export async function createSalesChannelAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = salesChannelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { channels, error: readError } = await getSalesChannels(supabase, organizationId);
  if (readError) return { ok: false, message: readError };
  const duplicated = channels.some((channel) => channel.active && channel.name.toLowerCase() === parsed.data.name.trim().toLowerCase());
  if (duplicated) return { ok: false, message: "Canal ja cadastrado." };

  const nextChannels = [
    ...channels,
    {
      id: crypto.randomUUID(),
      name: parsed.data.name.trim(),
      fee_percentage: parsed.data.fee_percentage,
      fixed_fee: parsed.data.fixed_fee,
      active: true,
    },
  ];

  const { error } = await supabase
    .from("organization_settings")
    .update({ rounding_rule: serializeSalesChannels(nextChannels) })
    .eq("organization_id", organizationId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vendas");
  return { ok: true, message: "Canal cadastrado." };
}

export async function deleteSalesChannelAction(id: string): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const { channels, error: readError } = await getSalesChannels(supabase, profile.organization_id);
  if (readError) return { ok: false, message: readError };

  const nextChannels = channels.map((channel) => (channel.id === id ? { ...channel, active: false } : channel));
  const { error } = await supabase
    .from("organization_settings")
    .update({ rounding_rule: serializeSalesChannels(nextChannels) })
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vendas");
  return { ok: true, message: "Canal removido." };
}

export async function updateSalesChannelAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const id = value(formData, "id");
  if (!id) return { ok: false, message: "Canal nao encontrado." };
  const parsed = salesChannelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { channels, error: readError } = await getSalesChannels(supabase, profile.organization_id);
  if (readError) return { ok: false, message: readError };
  const current = channels.find((channel) => channel.id === id);
  if (!current) return { ok: false, message: "Canal nao encontrado." };
  const duplicated = channels.some((channel) => (
    channel.id !== id &&
    channel.active &&
    channel.name.toLowerCase() === parsed.data.name.trim().toLowerCase()
  ));
  if (duplicated) return { ok: false, message: "Ja existe outro canal com esse nome." };

  const nextChannels = channels.map((channel) => (
    channel.id === id
      ? {
          ...channel,
          name: parsed.data.name.trim(),
          fee_percentage: parsed.data.fee_percentage,
          fixed_fee: parsed.data.fixed_fee,
          active: true,
        }
      : channel
  ));
  const { error } = await supabase
    .from("organization_settings")
    .update({ rounding_rule: serializeSalesChannels(nextChannels) })
    .eq("organization_id", profile.organization_id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/vendas");
  return { ok: true, message: "Canal atualizado." };
}

export async function createSaleAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile, user } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const rawData = Object.fromEntries(formData);
  if (rawData.sale_type === "own_use") {
    rawData.unit_price = "0";
    rawData.discount = "0";
    rawData.shipping = "0";
    rawData.channel_id = "";
  }
  const parsed = saleSchema.safeParse(rawData);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const isOwnUse = parsed.data.sale_type === "own_use";
  const { channels, error: channelsError } = await getSalesChannels(supabase, organizationId);
  if (channelsError) return { ok: false, message: channelsError };
  const channel = isOwnUse ? null : channels.find((item) => item.id === parsed.data.channel_id && item.active);
  if (!isOwnUse && !channel) return { ok: false, message: "Cadastre ou selecione um canal de venda." };

  const admin = createAdminClient();
  const { data: product, error: productError } = await admin
    .from("products")
    .select("*")
    .eq("id", parsed.data.product_id)
    .eq("organization_id", organizationId)
    .eq("active", true)
    .single();
  if (productError) return { ok: false, message: productError.message };
  if (product.finished_stock_quantity < parsed.data.quantity) {
    return { ok: false, message: `Estoque insuficiente: ${product.name} tem ${product.finished_stock_quantity} un.` };
  }

  let customerId: string | null = null;
  const customerName = isOwnUse ? null : optionalText(parsed.data.customer_name);
  if (customerName) {
    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({ organization_id: organizationId, name: customerName, phone: null, email: null, document: null, notes: null })
      .select("id")
      .single();
    if (customerError) return { ok: false, message: customerError.message };
    customerId = customer.id;
  }

  const subtotal = isOwnUse ? 0 : roundMoney(parsed.data.quantity * parsed.data.unit_price);
  const platformFee = isOwnUse ? 0 : roundMoney(calculateChannelFee(subtotal, channel!));
  const discount = isOwnUse ? 0 : parsed.data.discount;
  const shipping = isOwnUse ? 0 : parsed.data.shipping;
  const total = isOwnUse ? 0 : roundMoney(subtotal + shipping - discount - platformFee);
  const unitCost = Number(product.calculated_unit_cost) || 0;

  const { data: sale, error: saleError } = await admin
    .from("sales")
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      status: "completed",
      subtotal,
      discount,
      shipping,
      platform_fee: platformFee,
      total,
      payment_method: isOwnUse ? "Uso proprio" : channel!.name,
      payment_status: "paid",
      notes: [isOwnUse ? "Baixa para uso proprio" : null, optionalText(parsed.data.notes)].filter(Boolean).join(" - ") || null,
    })
    .select("id")
    .single();
  if (saleError) return { ok: false, message: saleError.message };

  const { error: itemError } = await admin.from("sale_items").insert({
    organization_id: organizationId,
    sale_id: sale.id,
    product_id: product.id,
    quantity: parsed.data.quantity,
    unit_price: isOwnUse ? 0 : parsed.data.unit_price,
    unit_cost_snapshot: unitCost,
    total: subtotal,
  });
  if (itemError) return { ok: false, message: itemError.message };

  const newBalance = product.finished_stock_quantity - parsed.data.quantity;
  const { error: updateError } = await admin.from("products").update({ finished_stock_quantity: newBalance }).eq("id", product.id);
  if (updateError) return { ok: false, message: updateError.message };

  const { error: movementError } = await admin.from("finished_product_movements").insert({
    organization_id: organizationId,
    item_id: product.id,
    movement_type: "sale",
    quantity: -parsed.data.quantity,
    previous_balance: product.finished_stock_quantity,
    new_balance: newBalance,
    unit_cost: unitCost,
    total_cost: parsed.data.quantity * unitCost,
    reference_type: "sale",
    reference_id: sale.id,
    notes: isOwnUse ? "Baixa para uso proprio" : `Venda via ${channel!.name}`,
    created_by: user.id,
  });
  if (movementError) return { ok: false, message: movementError.message };

  revalidatePath("/vendas");
  revalidatePath("/produtos");
  revalidatePath("/estoque");
  revalidatePath("/dashboard");
  return { ok: true, message: isOwnUse ? "Uso proprio lancado e estoque baixado." : "Venda lancada e estoque atualizado." };
}

export async function updateSettingsAction(formData: FormData): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organizationId = profile.organization_id;
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const { error } = await supabase
    .from("organization_settings")
    .upsert({ organization_id: organizationId, ...parsed.data }, { onConflict: "organization_id" });
  if (error) return { ok: false, message: error.message };

  const recalculateError = await recalculateActiveProducts(supabase, organizationId, parsed.data);
  if (recalculateError) return { ok: false, message: recalculateError };

  revalidatePath("/configuracoes");
  revalidatePath("/produtos");
  revalidatePath("/precificacao");
  revalidatePath("/dashboard");
  return { ok: true, message: "Configuracoes salvas e produtos recalculados." };
}

export async function addDemoDataAction(): Promise<MutationResult> {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) return { ok: false, message: "Organizacao nao encontrada." };
  const organization_id = profile.organization_id;
  await supabase.from("printers").insert({
    organization_id,
    name: "Bambu Lab A1",
    model: "A1 Combo",
    power_watts: 80,
    machine_cost_per_hour: 3,
    status: "available",
    total_printed_hours: 0,
    active: true,
  });
  await supabase.from("filaments").insert([
    { organization_id, name: "PLA branco", material: "PLA", color_name: "Branco", color_hex: "#f8fafc", initial_weight_grams: 1000, current_weight_grams: 1000, spool_weight_grams: 0, purchase_price: 99, minimum_stock_grams: 150, active: true },
    { organization_id, name: "PLA marrom", material: "PLA", color_name: "Marrom", color_hex: "#8b5e34", initial_weight_grams: 1000, current_weight_grams: 1000, spool_weight_grams: 0, purchase_price: 99, minimum_stock_grams: 150, active: true },
  ]);
  await supabase.from("inventory_supplies").insert({
    organization_id,
    name: "Clicker",
    category: "clicker",
    unit: "unidade",
    current_quantity: 100,
    minimum_quantity: 20,
    purchase_quantity: 100,
    purchase_price: 230,
    active: true,
  });
  revalidatePath("/dashboard");
  return { ok: true, message: "Dados de exemplo adicionados." };
}
