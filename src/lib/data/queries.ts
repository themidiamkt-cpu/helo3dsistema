import { createClient } from "@/lib/supabase/server";
import { hasSupabaseBrowserEnv } from "@/lib/supabase/env";

export async function getDashboardData() {
  if (!hasSupabaseBrowserEnv()) {
    return {
      products: [],
      orders: [],
      filaments: [],
      supplies: [],
      filamentMovements: [],
      finishedMovements: [],
    };
  }

  const supabase = await createClient();
  const [products, orders, filaments, supplies, filamentMovements, finishedMovements] = await Promise.all([
    supabase.from("products").select("*").eq("active", true),
    supabase.from("production_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("filaments").select("*").eq("active", true),
    supabase.from("inventory_supplies").select("*").eq("active", true),
    supabase.from("filament_movements").select("*").gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from("finished_product_movements").select("*"),
  ]);

  return {
    products: products.data ?? [],
    orders: orders.data ?? [],
    filaments: filaments.data ?? [],
    supplies: supplies.data ?? [],
    filamentMovements: filamentMovements.data ?? [],
    finishedMovements: finishedMovements.data ?? [],
  };
}

export async function listTable<
  T extends "filaments" | "inventory_supplies" | "printers" | "products" | "production_orders" | "sales" | "sale_items" | "customers"
>(
  table: T,
) {
  if (!hasSupabaseBrowserEnv()) return [];

  const supabase = await createClient();
  const query = supabase.from(table).select("*");
  const { data, error } = table === "sale_items" ? await query : await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
