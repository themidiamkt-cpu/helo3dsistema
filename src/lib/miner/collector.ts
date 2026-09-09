import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import type { MinerMarketplace } from "./types";
import { marketplaceAdapters } from "./adapters";
import { MarketplaceAdapterError } from "./adapters/base";
import { recalculateMinerScores, saveCollectedProduct } from "./repository";

type SupabaseAny = {
  from(table: string): any;
};

function admin() {
  return createAdminClient() as unknown as SupabaseAny;
}

export async function collectMinerProducts(params: {
  organizationId: string;
  marketplace?: MinerMarketplace;
  keyword?: string;
  limit?: number;
}) {
  const supabase = admin();
  const marketplaces = params.marketplace ? [params.marketplace] : (["MERCADO_LIVRE", "SHOPEE"] satisfies MinerMarketplace[]);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const { data: keywords, error } = params.keyword
    ? { data: [{ id: null, keyword: params.keyword, max_results: limit }], error: null }
    : await supabase
        .from("miner_keywords")
        .select("id,keyword,max_results")
        .eq("organization_id", params.organizationId)
        .eq("active", true)
        .eq("status", "APPROVED")
        .limit(10);
  if (error) throw new Error(error.message);

  const summary = [];
  for (const marketplace of marketplaces) {
    for (const keywordRow of ((keywords ?? []) as Array<{ id: string | null; keyword: string; max_results?: number }>)) {
      const startedAt = new Date().toISOString();
      const { data: job } = await supabase
        .from("miner_collection_jobs")
        .insert({
          organization_id: params.organizationId,
          marketplace,
          keyword_id: keywordRow.id,
          keyword: keywordRow.keyword,
          status: "RUNNING",
          started_at: startedAt,
        })
        .select("*")
        .single();

      try {
        const adapter = marketplaceAdapters[marketplace];
        const results = await adapter.search({ keyword: keywordRow.keyword, limit: Math.min(limit, keywordRow.max_results ?? limit) });
        let savedCount = 0;
        for (const product of results) {
          await saveCollectedProduct(params.organizationId, keywordRow.id, product);
          savedCount += 1;
        }
        await supabase
          .from("miner_collection_jobs")
          .update({
            status: "COMPLETED",
            finished_at: new Date().toISOString(),
            results_count: results.length,
            updated_products_count: savedCount,
          })
          .eq("id", (job as any)?.id);
        summary.push({ marketplace, keyword: keywordRow.keyword, status: "COMPLETED", results: results.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        await supabase
          .from("miner_collection_jobs")
          .update({ status: error instanceof MarketplaceAdapterError ? "CANCELLED" : "FAILED", finished_at: new Date().toISOString(), error_message: message })
          .eq("id", (job as any)?.id);
        await supabase.from("miner_collection_logs").insert({
          organization_id: params.organizationId,
          job_id: (job as any)?.id,
          marketplace,
          keyword: keywordRow.keyword,
          level: error instanceof MarketplaceAdapterError ? "warning" : "error",
          message,
        });
        summary.push({ marketplace, keyword: keywordRow.keyword, status: "FAILED", error: message });
      }
    }
  }

  await recalculateMinerScores(params.organizationId);
  return summary;
}
