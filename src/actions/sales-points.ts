"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/session";
import { salesPointSchema, salesPointStockSchema } from "@/lib/validations/schemas";

function value(formData: FormData, key: string) {
  const item = formData.get(key);
  return typeof item === "string" ? item : "";
}

function optionalText(text: string | undefined) {
  return text?.trim() ? text.trim() : null;
}

function revalidateSalesPoints() {
  revalidatePath("/pontos-de-venda");
  revalidatePath("/dashboard");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
}

export async function createSalesPointAction(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile.organization_id) throw new Error("Organizacao nao encontrada.");
  const parsed = salesPointSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");

  const payload = {
    organization_id: profile.organization_id,
    name: parsed.data.name,
    company_name: optionalText(parsed.data.company_name),
    responsible_name: optionalText(parsed.data.responsible_name),
    phone: optionalText(parsed.data.phone),
    email: optionalText(parsed.data.email),
    address: optionalText(parsed.data.address),
    city: optionalText(parsed.data.city),
    state: optionalText(parsed.data.state),
    commission_percentage: parsed.data.commission_percentage,
    status: parsed.data.status,
    notes: optionalText(parsed.data.notes),
  };

  const { error } = await supabase.from("sales_points").insert(payload);
  if (error) throw new Error(error.message);
  revalidateSalesPoints();
}

export async function updateSalesPointAction(formData: FormData) {
  const { supabase, profile } = await getCurrentProfile();
  const id = value(formData, "id");
  const parsed = salesPointSchema.safeParse(Object.fromEntries(formData));
  if (!profile.organization_id) throw new Error("Organizacao nao encontrada.");
  if (!id) throw new Error("Ponto invalido.");
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");

  const { error } = await supabase
    .from("sales_points")
    .update({
      name: parsed.data.name,
      company_name: optionalText(parsed.data.company_name),
      responsible_name: optionalText(parsed.data.responsible_name),
      phone: optionalText(parsed.data.phone),
      email: optionalText(parsed.data.email),
      address: optionalText(parsed.data.address),
      city: optionalText(parsed.data.city),
      state: optionalText(parsed.data.state),
      commission_percentage: parsed.data.commission_percentage,
      status: parsed.data.status,
      notes: optionalText(parsed.data.notes),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  if (error) throw new Error(error.message);
  revalidateSalesPoints();
}

export async function transferToSalesPointAction(formData: FormData) {
  const parsed = salesPointStockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  const { supabase } = await getCurrentProfile();

  const { error } = await supabase.rpc("transfer_product_to_sales_point", {
    p_sales_point_id: parsed.data.sales_point_id,
    p_product_id: parsed.data.product_id,
    p_quantity: parsed.data.quantity,
    p_minimum_quantity: parsed.data.minimum_quantity,
    p_reason: optionalText(parsed.data.reason),
  });

  if (error) throw new Error(error.message);
  revalidateSalesPoints();
}

export async function withdrawFromSalesPointAction(formData: FormData) {
  const parsed = salesPointStockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  const { supabase } = await getCurrentProfile();

  const { error } = await supabase.rpc("withdraw_product_from_sales_point", {
    p_sales_point_id: parsed.data.sales_point_id,
    p_product_id: parsed.data.product_id,
    p_quantity: parsed.data.quantity,
    p_reason: optionalText(parsed.data.reason),
  });

  if (error) throw new Error(error.message);
  revalidateSalesPoints();
}
