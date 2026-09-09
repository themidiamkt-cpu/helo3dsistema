import { z } from "zod";
import { MATERIALS, PRINTER_STATUSES, PRODUCTION_STATUSES, SUPPLY_UNITS } from "@/lib/constants";

const money = z.coerce.number().min(0);
const quantity = z.coerce.number().min(0);

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const signUpSchema = loginSchema.extend({
  full_name: z.string().min(2, "Informe seu nome."),
  organization_name: z.string().min(2, "Informe o nome da empresa."),
});

export const resetPasswordSchema = z.object({
  email: z.email("Informe um e-mail valido."),
});

export const filamentSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  brand: z.string().optional(),
  material: z.enum(MATERIALS),
  color_name: z.string().optional(),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal("")),
  supplier: z.string().optional(),
  initial_weight_grams: quantity.gt(0),
  current_weight_grams: quantity,
  spool_weight_grams: quantity,
  purchase_price: money,
  minimum_stock_grams: quantity,
  purchase_date: z.string().optional(),
  lot_number: z.string().optional(),
  notes: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

export const supplySchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  category: z.string().min(1),
  unit: z.enum(SUPPLY_UNITS),
  current_quantity: quantity,
  minimum_quantity: quantity,
  purchase_quantity: quantity.gt(0),
  purchase_price: money,
  supplier: z.string().optional(),
  notes: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

export const printerSchema = z.object({
  name: z.string().min(2),
  model: z.string().optional(),
  power_watts: quantity.gt(0),
  machine_cost_per_hour: money,
  purchase_price: money.optional(),
  purchase_date: z.string().optional(),
  status: z.enum(PRINTER_STATUSES).default("available"),
  total_printed_hours: quantity.default(0),
  maintenance_interval_hours: quantity.optional(),
  next_maintenance_at_hours: quantity.optional(),
  notes: z.string().optional(),
  active: z.coerce.boolean().default(true),
});

export const pricingSchema = z.object({
  print_time_minutes: z.coerce.number().int().min(1),
  batch_quantity: z.coerce.number().int().min(1),
  packaging_cost: money,
  fixed_labor_cost: money,
  labor_time_minutes: z.coerce.number().int().min(0),
  labor_cost_per_hour: money,
  machine_cost_per_hour: money,
  energy_cost_per_kwh: money,
  printer_power_watts: quantity,
  waste_percentage: z.coerce.number().min(0).max(100),
  desired_markup: z.coerce.number().gt(0),
});

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal("")),
  printer_id: z.string().uuid("Selecione uma impressora."),
  print_time_minutes: z.coerce.number().int().min(1),
  batch_quantity: z.coerce.number().int().min(1),
  packaging_cost: money,
  fixed_labor_cost: money,
  labor_time_minutes: z.coerce.number().int().min(0),
  manual_sale_price: money.optional(),
  finished_stock_quantity: z.coerce.number().int().min(0).default(0),
  minimum_finished_stock: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const settingsSchema = z.object({
  energy_cost_per_kwh: money,
  default_labor_cost_per_hour: money,
  default_waste_percentage: z.coerce.number().min(0).max(100),
  default_markup: z.coerce.number().gt(0),
});

export const productionOrderSchema = z.object({
  product_id: z.string().uuid(),
  printer_id: z.string().uuid().optional().or(z.literal("")),
  planned_quantity: z.coerce.number().int().min(1),
  status: z.enum(PRODUCTION_STATUSES).default("draft"),
  planned_start_at: z.string().optional(),
  notes: z.string().optional(),
});

export const salesChannelSchema = z.object({
  name: z.string().min(2, "Informe o canal."),
  fee_percentage: z.coerce.number().min(0).max(100),
  fixed_fee: money,
});

export const saleSchema = z.object({
  product_id: z.string().uuid("Selecione um produto."),
  sale_type: z.enum(["sale", "own_use"]).default("sale"),
  channel_id: z.string().optional(),
  quantity: z.coerce.number().int().min(1),
  unit_price: money,
  discount: money.default(0),
  shipping: money.default(0),
  customer_name: z.string().optional(),
  notes: z.string().optional(),
});

export const salesPointSchema = z.object({
  name: z.string().min(2, "Informe o nome do ponto."),
  company_name: z.string().optional(),
  responsible_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Informe um e-mail valido.").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  commission_percentage: z.coerce.number().min(0).max(100),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
});

export const salesPointStockSchema = z.object({
  sales_point_id: z.string().uuid("Selecione o ponto."),
  product_id: z.string().uuid("Selecione o produto."),
  quantity: z.coerce.number().int().min(1, "Informe a quantidade."),
  minimum_quantity: z.coerce.number().int().min(0).default(0),
  reason: z.string().optional(),
});
