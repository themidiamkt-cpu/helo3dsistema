export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          full_name: string | null;
          email: string;
          role: "owner" | "admin" | "operator";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          full_name?: string | null;
          email: string;
          role?: "owner" | "admin" | "operator";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      organizations: {
        Row: { id: string; name: string; slug: string; created_at: string };
        Insert: { id?: string; name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      organization_settings: {
        Row: {
          id: string;
          organization_id: string;
          energy_cost_per_kwh: number;
          default_printer_power_watts: number;
          default_machine_cost_per_hour: number;
          default_labor_cost_per_hour: number;
          default_waste_percentage: number;
          default_markup: number;
          minimum_profit_margin: number;
          rounding_rule: string;
          currency: "BRL";
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organization_settings"]["Row"]> & {
          organization_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["organization_settings"]["Insert"]>;
        Relationships: [];
      };
      filaments: {
        Row: Filament;
        Insert: FilamentInsert;
        Update: Partial<FilamentInsert>;
        Relationships: [];
      };
      inventory_supplies: {
        Row: InventorySupply;
        Insert: InventorySupplyInsert;
        Update: Partial<InventorySupplyInsert>;
        Relationships: [];
      };
      printers: {
        Row: Printer;
        Insert: PrinterInsert;
        Update: Partial<PrinterInsert>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: Partial<ProductInsert>;
        Relationships: [];
      };
      product_filaments: {
        Row: ProductFilament;
        Insert: Omit<ProductFilament, "id"> & { id?: string };
        Update: Partial<Omit<ProductFilament, "id">>;
        Relationships: [];
      };
      product_supplies: {
        Row: ProductSupply;
        Insert: Omit<ProductSupply, "id"> & { id?: string };
        Update: Partial<Omit<ProductSupply, "id">>;
        Relationships: [];
      };
      production_orders: {
        Row: ProductionOrder;
        Insert: ProductionOrderInsert;
        Update: Partial<ProductionOrderInsert>;
        Relationships: [];
      };
      production_order_filaments: {
        Row: ProductionOrderFilament;
        Insert: Omit<ProductionOrderFilament, "id"> & { id?: string };
        Update: Partial<Omit<ProductionOrderFilament, "id">>;
        Relationships: [];
      };
      filament_movements: { Row: StockMovement; Insert: StockMovementInsert; Update: never; Relationships: [] };
      supply_movements: { Row: StockMovement; Insert: StockMovementInsert; Update: never; Relationships: [] };
      finished_product_movements: { Row: StockMovement; Insert: StockMovementInsert; Update: never; Relationships: [] };
      customers: {
        Row: Customer;
        Insert: Omit<Customer, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Customer, "id" | "created_at">>;
        Relationships: [];
      };
      sales: {
        Row: Sale;
        Insert: Omit<Sale, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Sale, "id" | "created_at">>;
        Relationships: [];
      };
      sale_items: {
        Row: SaleItem;
        Insert: Omit<SaleItem, "id"> & { id?: string };
        Update: Partial<Omit<SaleItem, "id">>;
        Relationships: [];
      };
      sales_points: {
        Row: SalesPoint;
        Insert: Omit<SalesPoint, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<SalesPoint, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      sales_point_stock: {
        Row: SalesPointStock;
        Insert: Omit<SalesPointStock, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<SalesPointStock, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      sales_point_qrcodes: {
        Row: SalesPointQRCode;
        Insert: Omit<SalesPointQRCode, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<SalesPointQRCode, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      sales_point_sales: {
        Row: SalesPointSale;
        Insert: Partial<Omit<SalesPointSale, "id" | "created_at" | "updated_at">> & {
          organization_id: string;
          sales_point_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          total_amount: number;
        };
        Update: Partial<Omit<SalesPointSale, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      sales_point_commissions: {
        Row: SalesPointCommission;
        Insert: Omit<SalesPointCommission, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<SalesPointCommission, "id" | "created_at">>;
        Relationships: [];
      };
      sales_point_movements: {
        Row: SalesPointMovement;
        Insert: Omit<SalesPointMovement, "id" | "created_at"> & { id?: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      register_filament_purchase: { Args: { p_filament_id: string; p_quantity: number; p_total_cost: number; p_notes?: string }; Returns: Json };
      register_supply_purchase: { Args: { p_supply_id: string; p_quantity: number; p_total_cost: number; p_notes?: string }; Returns: Json };
      adjust_finished_product_stock: { Args: { p_product_id: string; p_quantity_delta: number; p_notes?: string }; Returns: Json };
      finish_production_order: { Args: { p_order_id: string; p_produced_quantity: number; p_failed_quantity: number; p_actual_minutes: number; p_notes?: string }; Returns: Json };
      transfer_product_to_sales_point: { Args: { p_sales_point_id: string; p_product_id: string; p_quantity: number; p_minimum_quantity?: number; p_reason?: string | null }; Returns: Json };
      withdraw_product_from_sales_point: { Args: { p_sales_point_id: string; p_product_id: string; p_quantity: number; p_reason?: string | null }; Returns: Json };
      confirm_sales_point_sale: { Args: { p_sale_id: string; p_payment_id?: string | null; p_raw_payload?: Json }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Filament = {
  id: string;
  organization_id: string;
  name: string;
  brand: string | null;
  material: string;
  color_name: string | null;
  color_hex: string | null;
  supplier: string | null;
  initial_weight_grams: number;
  current_weight_grams: number;
  spool_weight_grams: number;
  purchase_price: number;
  cost_per_gram: number;
  minimum_stock_grams: number;
  purchase_date: string | null;
  lot_number: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FilamentInsert = Partial<Omit<Filament, "id" | "created_at" | "updated_at" | "cost_per_gram">> & {
  id?: string;
  organization_id: string;
  name: string;
  material: string;
  initial_weight_grams: number;
  purchase_price: number;
  cost_per_gram?: number;
};

export type InventorySupply = {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  current_quantity: number;
  minimum_quantity: number;
  purchase_quantity: number;
  purchase_price: number;
  unit_cost: number;
  supplier: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InventorySupplyInsert = Partial<Omit<InventorySupply, "id" | "created_at" | "updated_at" | "unit_cost">> & {
  id?: string;
  organization_id: string;
  name: string;
  category: string;
  unit: string;
  purchase_quantity: number;
  purchase_price: number;
  unit_cost?: number;
};

export type Printer = {
  id: string;
  organization_id: string;
  name: string;
  model: string | null;
  power_watts: number;
  machine_cost_per_hour: number;
  purchase_price: number | null;
  purchase_date: string | null;
  status: "available" | "printing" | "maintenance" | "inactive";
  total_printed_hours: number;
  maintenance_interval_hours: number | null;
  next_maintenance_at_hours: number | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PrinterInsert = Partial<Omit<Printer, "id" | "created_at" | "updated_at">> & {
  id?: string;
  organization_id: string;
  name: string;
};

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  printer_id: string | null;
  print_time_minutes: number;
  batch_quantity: number;
  packaging_cost: number;
  fixed_labor_cost: number;
  labor_time_minutes: number;
  machine_cost_per_hour: number;
  energy_cost_per_kwh: number;
  printer_power_watts: number;
  waste_percentage: number;
  desired_markup: number;
  manual_sale_price: number | null;
  calculated_cost: number;
  calculated_unit_cost: number;
  calculated_sale_price: number;
  finished_stock_quantity: number;
  minimum_finished_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = Partial<Omit<Product, "id" | "created_at" | "updated_at">> & {
  id?: string;
  organization_id: string;
  name: string;
  print_time_minutes: number;
  batch_quantity: number;
};

export type ProductFilament = {
  id: string;
  organization_id: string;
  product_id: string;
  filament_id: string;
  weight_grams: number;
};

export type ProductSupply = {
  id: string;
  organization_id: string;
  product_id: string;
  supply_id: string;
  quantity: number;
};

export type ProductionOrder = {
  id: string;
  organization_id: string;
  order_number: string;
  product_id: string;
  printer_id: string | null;
  planned_quantity: number;
  produced_quantity: number;
  failed_quantity: number;
  status: "draft" | "waiting" | "slicing" | "printing" | "finishing" | "completed" | "failed" | "cancelled";
  planned_start_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  estimated_minutes: number;
  actual_minutes: number | null;
  estimated_material_cost: number;
  actual_material_cost: number | null;
  estimated_total_cost: number;
  actual_total_cost: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductionOrderInsert = Partial<Omit<ProductionOrder, "id" | "created_at" | "updated_at">> & {
  id?: string;
  organization_id: string;
  order_number: string;
  product_id: string;
  planned_quantity: number;
};

export type ProductionOrderFilament = {
  id: string;
  organization_id: string;
  production_order_id: string;
  filament_id: string;
  planned_weight_grams: number;
  actual_weight_grams: number;
  wasted_weight_grams: number;
  unit_cost_snapshot: number;
  total_cost: number;
};

export type StockMovement = {
  id: string;
  organization_id: string;
  item_id: string;
  movement_type: string;
  quantity: number;
  previous_balance: number;
  new_balance: number;
  unit_cost: number;
  total_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export type StockMovementInsert = Omit<StockMovement, "id" | "created_at" | "created_by"> & {
  id?: string;
  created_by?: string | null;
};

export type Customer = {
  id: string;
  organization_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  created_at: string;
};

export type Sale = {
  id: string;
  organization_id: string;
  customer_id: string | null;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  platform_fee: number;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  notes: string | null;
  created_at: string;
};

export type SaleItem = {
  id: string;
  organization_id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost_snapshot: number;
  total: number;
};

export type SalesPoint = {
  id: string;
  organization_id: string;
  name: string;
  company_name: string | null;
  responsible_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  commission_percentage: number;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesPointStock = {
  id: string;
  organization_id: string;
  sales_point_id: string;
  product_id: string;
  quantity: number;
  minimum_quantity: number;
  created_at: string;
  updated_at: string;
};

export type SalesPointQRCode = {
  id: string;
  organization_id: string;
  sales_point_id: string;
  product_id: string;
  token: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type SalesPointSale = {
  id: string;
  organization_id: string;
  sales_point_id: string;
  product_id: string;
  qrcode_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;
  commission_percentage: number;
  commission_amount: number;
  company_amount: number;
  payment_provider: string;
  payment_id: string | null;
  payment_status: string;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  pix_expires_at: string | null;
  status: "pending" | "completed" | "cancelled" | "failed";
  raw_payload: Json;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesPointCommission = {
  id: string;
  organization_id: string;
  sales_point_id: string;
  sale_id: string;
  percentage: number;
  gross_amount: number;
  commission_amount: number;
  company_amount: number;
  status: "payable" | "paid" | "cancelled";
  paid_at: string | null;
  created_at: string;
};

export type SalesPointMovement = {
  id: string;
  organization_id: string;
  sales_point_id: string | null;
  product_id: string;
  movement_type: "replenishment" | "withdrawal" | "sale" | "adjustment" | "cancellation";
  quantity: number;
  previous_point_balance: number | null;
  new_point_balance: number | null;
  previous_main_balance: number | null;
  new_main_balance: number | null;
  origin: string | null;
  destination: string | null;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
};
