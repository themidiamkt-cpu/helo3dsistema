"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMinerContext, seedMinerDemoData } from "@/lib/miner/repository";
import { collectMinerProducts } from "@/lib/miner/collector";

type SupabaseAny = {
  from(table: string): any;
};

function admin() {
  return createAdminClient() as unknown as SupabaseAny;
}

function numberFromForm(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

export async function seedMinerDemoAction() {
  const { organizationId } = await getMinerContext();
  await seedMinerDemoData(organizationId);
  revalidatePath("/minerador");
}

export async function createMinerKeywordAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return;
  await admin().from("miner_keywords").upsert(
    {
      organization_id: organizationId,
      keyword,
      active: true,
      status: "APPROVED",
      max_results: numberFromForm(formData, "max_results", 50),
    },
    { onConflict: "organization_id,keyword" }
  );
  revalidatePath("/minerador/keywords");
}

export async function toggleMinerKeywordAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  await admin()
    .from("miner_keywords")
    .update({ active: formData.get("active") === "true" })
    .eq("organization_id", organizationId)
    .eq("id", String(formData.get("id")));
  revalidatePath("/minerador/keywords");
}

export async function deleteMinerKeywordAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  await admin().from("miner_keywords").delete().eq("organization_id", organizationId).eq("id", String(formData.get("id")));
  revalidatePath("/minerador/keywords");
}

export async function collectMinerAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  const marketplace = String(formData.get("marketplace") || "") || undefined;
  const keyword = String(formData.get("keyword") || "") || undefined;
  await collectMinerProducts({
    organizationId,
    marketplace: marketplace as "SHOPEE" | "MERCADO_LIVRE" | undefined,
    keyword,
    limit: numberFromForm(formData, "limit", 20),
  });
  revalidatePath("/minerador");
  revalidatePath("/minerador/jobs");
}

export async function updateMinerSettingsAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  await admin()
    .from("miner_settings")
    .upsert(
      {
        organization_id: organizationId,
        probability_threshold: numberFromForm(formData, "probability_threshold", 70),
        pla_cost_per_kg: numberFromForm(formData, "pla_cost_per_kg", 99),
        petg_cost_per_kg: numberFromForm(formData, "petg_cost_per_kg", 110),
        machine_cost_per_hour: numberFromForm(formData, "machine_cost_per_hour", 3),
        max_results_per_keyword: numberFromForm(formData, "max_results_per_keyword", 100),
        collection_interval_hours: numberFromForm(formData, "collection_interval_hours", 24),
        openai_model: String(formData.get("openai_model") || "gpt-5-mini"),
        shopee_enabled: formData.get("shopee_enabled") === "on",
        mercadolivre_enabled: formData.get("mercadolivre_enabled") === "on",
      },
      { onConflict: "organization_id" }
    );
  revalidatePath("/minerador/configuracoes");
}

export async function toggleMinerFavoriteAction(formData: FormData) {
  const { organizationId } = await getMinerContext();
  const productId = String(formData.get("product_id"));
  const favorite = formData.get("favorite") === "true";
  if (favorite) {
    await admin().from("miner_favorites").upsert({ organization_id: organizationId, product_id: productId }, { onConflict: "organization_id,product_id" });
  } else {
    await admin().from("miner_favorites").delete().eq("organization_id", organizationId).eq("product_id", productId);
  }
  revalidatePath("/minerador");
  revalidatePath("/minerador/favoritos");
}
