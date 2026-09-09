import "server-only";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/supabase/session";
import { canonicalUrl, calculateOpportunityScore, estimateSalesFromHistory, normalizeTitle } from "./metrics";
import type { MinerMarketplace, MinerSnapshot, NormalizedMarketplaceProduct } from "./types";

type SupabaseAny = {
  from(table: string): any;
};

export type MinerProductRow = {
  id: string;
  organization_id: string;
  marketplace: MinerMarketplace;
  external_id: string | null;
  canonical_url: string;
  title: string;
  url: string;
  image_url: string | null;
  first_seen_at: string;
  last_seen_at: string;
  active: boolean;
  demo: boolean;
};

export type MinerProductWithScore = MinerProductRow & {
  latest_price: number | null;
  latest_sold_quantity: number | null;
  latest_rating: number | null;
  latest_review_count: number | null;
  score: number | null;
  trend: string | null;
  lifecycle: string | null;
  probability_3d_printed: number | null;
  likely_manufacturing: string | null;
};

function admin() {
  return createAdminClient() as unknown as SupabaseAny;
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getMinerContext() {
  const { profile } = await getCurrentProfile();
  if (!profile.organization_id) throw new Error("Perfil sem organizacao vinculada.");
  return { organizationId: profile.organization_id };
}

export async function getMinerKeywords(organizationId: string) {
  const { data, error } = await admin()
    .from("miner_keywords")
    .select("*")
    .eq("organization_id", organizationId)
    .order("active", { ascending: false })
    .order("keyword");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getMinerSettings(organizationId: string) {
  const { data, error } = await admin().from("miner_settings").select("*").eq("organization_id", organizationId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getMinerProducts(organizationId: string, options?: { favoritesOnly?: boolean; opportunitiesOnly?: boolean; emergingOnly?: boolean }) {
  const { data: products, error } = await admin()
    .from("miner_products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("active", true)
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(error.message);

  const productRows = (products ?? []) as MinerProductRow[];
  const ids = productRows.map((item) => item.id);
  if (!ids.length) return [];

  const [{ data: scores }, { data: classifications }, { data: favorites }, { data: snapshots }] = await Promise.all([
    admin().from("miner_opportunity_scores").select("*").in("product_id", ids),
    admin().from("miner_product_classifications").select("*").in("product_id", ids),
    admin().from("miner_favorites").select("*").in("product_id", ids),
    admin().from("miner_product_snapshots").select("*").in("product_id", ids).order("collected_at", { ascending: false }),
  ]);

  const scoreRows = (scores ?? []) as any[];
  const classificationRows = (classifications ?? []) as any[];
  const favoriteRows = (favorites ?? []) as any[];
  const snapshotRows = (snapshots ?? []) as any[];
  const scoreByProduct = new Map(scoreRows.map((item) => [item.product_id, item]));
  const classByProduct = new Map(classificationRows.map((item) => [item.product_id, item]));
  const favoriteSet = new Set(favoriteRows.map((item) => item.product_id));
  const latestByProduct = new Map<string, any>();
  for (const snapshot of snapshotRows) {
    if (!latestByProduct.has(snapshot.product_id)) latestByProduct.set(snapshot.product_id, snapshot);
  }

  return productRows
    .map((product: MinerProductRow) => {
      const score = scoreByProduct.get(product.id);
      const classification = classByProduct.get(product.id);
      const latest = latestByProduct.get(product.id);
      return {
        ...product,
        latest_price: asNumber(latest?.price),
        latest_sold_quantity: latest?.sold_quantity ?? null,
        latest_rating: asNumber(latest?.rating),
        latest_review_count: latest?.review_count ?? null,
        score: asNumber(score?.score),
        trend: score?.trend ?? null,
        lifecycle: score?.lifecycle ?? null,
        probability_3d_printed: classification?.probability_3d_printed ?? null,
        likely_manufacturing: classification?.likely_manufacturing ?? null,
        is_favorite: favoriteSet.has(product.id),
      };
    })
    .filter((item: any) => (options?.favoritesOnly ? favoriteSet.has(item.id) : true))
    .filter((item: any) => (options?.opportunitiesOnly ? (item.score ?? 0) >= 50 : true))
    .filter((item: any) => (options?.emergingOnly ? ["NEW", "EMERGING", "HOT"].includes(item.lifecycle ?? "") : true))
    .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
}

export async function getMinerDashboard(organizationId: string) {
  const [{ data: products }, { data: keywords }, { data: jobs }, { data: scores }, { data: favorites }] = await Promise.all([
    admin().from("miner_products").select("id,demo").eq("organization_id", organizationId),
    admin().from("miner_keywords").select("id,active").eq("organization_id", organizationId),
    admin().from("miner_collection_jobs").select("id,status").eq("organization_id", organizationId),
    admin().from("miner_opportunity_scores").select("score,lifecycle").eq("organization_id", organizationId),
    admin().from("miner_favorites").select("id").eq("organization_id", organizationId),
  ]);
  const opportunityCount = (scores ?? []).filter((item: any) => Number(item.score) >= 50).length;
  const emergingCount = (scores ?? []).filter((item: any) => ["NEW", "EMERGING", "HOT"].includes(item.lifecycle)).length;
  return {
    products: (products as any[] | null)?.length ?? 0,
    demoProducts: ((products ?? []) as any[]).filter((item) => item.demo).length,
    activeKeywords: ((keywords ?? []) as any[]).filter((item) => item.active).length,
    runningJobs: ((jobs ?? []) as any[]).filter((item) => item.status === "RUNNING" || item.status === "QUEUED").length,
    opportunityCount,
    emergingCount,
    favorites: (favorites as any[] | null)?.length ?? 0,
  };
}

function heuristicClassification(product: NormalizedMarketplaceProduct) {
  const normalized = normalizeTitle(product.title);
  const strong3d = /(3d|impresso|impressao|pla|fdm|articulado|flexi|personalizado|suporte|organizador|porta)/.test(normalized);
  const likelyNot3d = /(pelucia|tecido|roupa|vestido|camiseta|metal|aco inox|madeira macica)/.test(normalized);
  const probability = likelyNot3d ? 20 : strong3d ? 82 : 55;
  return {
    probability_3d_printed: probability,
    likely_manufacturing: probability >= 70 ? "FDM" : "UNKNOWN",
    likely_material: probability >= 70 ? "PLA" : "UNKNOWN",
    print_complexity: normalized.length > 70 ? "HIGH" : normalized.includes("kit") || normalized.includes("articulado") ? "MEDIUM" : "LOW",
    estimated_print_difficulty: normalized.length > 70 ? 70 : 45,
    confidence: probability >= 70 ? 65 : 35,
    reason: probability >= 70 ? "Classificacao inicial por palavras-chave de produto impresso 3D." : "Classificacao inicial com baixa confianca; revisar com IA.",
    model: "heuristic-v1",
    data_source: "MANUAL",
  };
}

export async function saveCollectedProduct(organizationId: string, keywordId: string | null, product: NormalizedMarketplaceProduct) {
  const supabase = admin();
  let sellerId: string | null = null;
  if (product.seller_name || product.seller_url) {
    const sellerExternalId = product.seller_url || product.seller_name || product.url;
    const { data: seller, error: sellerError } = await supabase
      .from("miner_sellers")
      .upsert(
        {
          organization_id: organizationId,
          marketplace: product.marketplace,
          external_id: sellerExternalId,
          name: product.seller_name,
          url: product.seller_url,
          location: product.location,
          last_seen_at: product.collected_at,
        },
        { onConflict: "organization_id,marketplace,external_id" }
      )
      .select("id")
      .single();
    if (sellerError) throw new Error(sellerError.message);
    sellerId = seller.id;
  }

  const { data: saved, error } = await supabase
    .from("miner_products")
    .upsert(
      {
        organization_id: organizationId,
        marketplace: product.marketplace,
        external_id: product.external_id,
        canonical_url: canonicalUrl(product.url),
        title: product.title,
        url: product.url,
        image_url: product.image_url,
        seller_id: sellerId,
        last_seen_at: product.collected_at,
      },
      product.external_id ? { onConflict: "organization_id,marketplace,external_id" } : { onConflict: "organization_id,marketplace,canonical_url" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const { error: snapshotError } = await supabase.from("miner_product_snapshots").insert({
    organization_id: organizationId,
    product_id: saved.id,
    keyword_id: keywordId,
    keyword: product.keyword,
    price: product.price,
    original_price: product.original_price,
    sold_quantity: product.sold_quantity,
    rating: product.rating,
    review_count: product.review_count,
    search_position: product.search_position,
    sponsored: product.sponsored,
    collected_at: product.collected_at,
    data_source: product.data_source,
    raw_payload: product.raw_payload ?? {},
  });
  if (snapshotError) throw new Error(snapshotError.message);

  const classification = heuristicClassification(product);
  await supabase
    .from("miner_product_classifications")
    .upsert({ organization_id: organizationId, product_id: saved.id, ...classification }, { onConflict: "organization_id,product_id" });

  return saved as unknown as MinerProductRow;
}

export async function recalculateMinerScores(organizationId: string) {
  const supabase = admin();
  const { data: products, error } = await supabase.from("miner_products").select("*").eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  for (const product of ((products ?? []) as MinerProductRow[])) {
    const [{ data: snapshots }, { data: classification }] = await Promise.all([
      supabase.from("miner_product_snapshots").select("*").eq("product_id", product.id).order("collected_at", { ascending: true }),
      supabase.from("miner_product_classifications").select("*").eq("product_id", product.id).maybeSingle(),
    ]);
    const classificationRow = classification as any;
    const typedSnapshots = (snapshots ?? []).map((item: any) => ({
      price: asNumber(item.price),
      sold_quantity: item.sold_quantity,
      rating: asNumber(item.rating),
      review_count: item.review_count,
      search_position: item.search_position,
      sponsored: item.sponsored,
      collected_at: item.collected_at,
      data_source: item.data_source,
    })) satisfies MinerSnapshot[];
    const latest = typedSnapshots.at(-1);
    const sales7d = estimateSalesFromHistory(typedSnapshots, 7);
    const sales30d = estimateSalesFromHistory(typedSnapshots, 30);
    const score = calculateOpportunityScore({
      price: latest?.price ?? null,
      sales7d,
      sales30d,
      revenue30d: latest?.price && sales30d !== null ? latest.price * sales30d : null,
      competitorCount: 1,
      probability3dPrinted: classificationRow?.probability_3d_printed ?? null,
      printDifficulty: classificationRow?.estimated_print_difficulty ?? null,
      reviewCount: latest?.review_count ?? null,
      rating: latest?.rating ?? null,
      firstSeenAt: product.first_seen_at,
    });
    await supabase.from("miner_opportunity_scores").upsert(
      {
        organization_id: organizationId,
        product_id: product.id,
        score: score.score,
        demand_score: score.demandScore,
        growth_score: score.growthScore,
        competition_score: score.competitionScore,
        commercial_score: score.commercialScore,
        production_ease_score: score.productionEaseScore,
        quality_score: score.qualityScore,
        trend: score.trend,
        lifecycle: score.lifecycle,
        reasons: score.reasons,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,product_id" }
    );
  }
}

const demoProducts: Array<NormalizedMarketplaceProduct & { snapshots: Array<{ daysAgo: number; sold: number; price: number }> }> = [
  ["Suporte controle remoto parede impresso 3D", "MERCADO_LIVRE", 39.9, 86, "organizadores 3d"],
  ["Dragao articulado flexi PLA colorido", "MERCADO_LIVRE", 59.9, 214, "brinquedo articulado"],
  ["Porta celular de mesa impresso 3D", "MERCADO_LIVRE", 24.9, 132, "suporte 3d"],
  ["Chaveiro personalizado 3D nome", "MERCADO_LIVRE", 12.9, 480, "chaveiro 3d"],
  ["Ovo fidget sensorial articulado 3D", "MERCADO_LIVRE", 29.9, 74, "ovo fidget"],
  ["Mini vaso geometrico decoracao 3D", "MERCADO_LIVRE", 34.9, 49, "decoracao 3d"],
  ["Porta headset gamer 3D", "MERCADO_LIVRE", 44.9, 96, "suporte headset"],
  ["Cortador de massa personalizado 3D", "MERCADO_LIVRE", 18.9, 305, "cortador 3d"],
  ["Boneco articulado flexivel impresso 3D", "MERCADO_LIVRE", 49.9, 121, "boneco articulado"],
  ["Organizador de mesa modular 3D", "MERCADO_LIVRE", 64.9, 58, "organizador 3d"],
  ["Nossa Senhora miniatura impressa 3D", "MERCADO_LIVRE", 35.9, 90, "santos catolicos"],
  ["Porta terco catolico impresso 3D", "MERCADO_LIVRE", 27.9, 62, "porta terco"],
  ["Suporte escova eletrica 3D", "MERCADO_LIVRE", 22.9, 77, "suporte 3d"],
  ["Fidget clicker brinquedo sensorial 3D", "MERCADO_LIVRE", 21.9, 155, "fidget 3d"],
  ["Caixa organizadora para pilhas 3D", "MERCADO_LIVRE", 31.9, 39, "organizadores 3d"],
  ["Porta controle Xbox 3D", "MERCADO_LIVRE", 42.9, 68, "porta controle"],
  ["Miniatura Jesus decoracao 3D", "MERCADO_LIVRE", 38.9, 44, "jesus"],
  ["Flexi polvo articulado 3D", "MERCADO_LIVRE", 36.9, 210, "flexi"],
  ["Suporte roteador parede 3D", "MERCADO_LIVRE", 29.9, 31, "suporte 3d"],
  ["Porta lapis decorativo impresso 3D", "MERCADO_LIVRE", 33.9, 53, "organizadores 3d"],
  ["Fidget estrela articulada 3D", "MERCADO_LIVRE", 19.9, 188, "fidget 3d"],
  ["Suporte controle remoto sofa 3D", "MERCADO_LIVRE", 25.9, 47, "porta controle"],
  ["Santo Antonio miniatura 3D", "MERCADO_LIVRE", 34.9, 28, "santo"],
  ["Organizador cabo USB impresso 3D", "MERCADO_LIVRE", 14.9, 240, "organizador 3d"],
  ["Porta celular carro 3D", "MERCADO_LIVRE", 28.9, 66, "porta celular"],
  ["Brinquedo articulado lagartixa 3D", "MERCADO_LIVRE", 46.9, 83, "brinquedo articulado"],
  ["Suporte Echo Dot parede 3D", "MERCADO_LIVRE", 37.9, 52, "suporte 3d"],
  ["Mini cacto vaso PLA 3D", "MERCADO_LIVRE", 23.9, 71, "decoracao 3d"],
  ["Terco decorativo impresso 3D", "MERCADO_LIVRE", 41.9, 35, "terco"],
  ["Suporte joystick parede 3D", "MERCADO_LIVRE", 45.9, 92, "suporte 3d"],
].map(([title, marketplace, price, sold, keyword], index) => ({
  marketplace: marketplace as MinerMarketplace,
  external_id: `DEMO-${index + 1}`,
  title: title as string,
  url: `https://example.com/minerador/demo-${index + 1}`,
  image_url: null,
  price: price as number,
  original_price: null,
  sold_quantity: sold as number,
  rating: 4.4 + (index % 5) / 10,
  review_count: Math.max(8, Math.round((sold as number) * 0.28)),
  seller_name: `Loja demo ${(index % 8) + 1}`,
  seller_url: null,
  location: "Brasil",
  keyword: keyword as string,
  search_position: (index % 12) + 1,
  sponsored: index % 7 === 0,
  collected_at: new Date().toISOString(),
  data_source: "MANUAL",
  raw_payload: { demo: true },
  snapshots: [
    { daysAgo: 30, sold: Math.max(0, (sold as number) - 30 - (index % 9) * 4), price: price as number },
    { daysAgo: 7, sold: Math.max(0, (sold as number) - 6 - (index % 6) * 2), price: price as number },
    { daysAgo: 0, sold: sold as number, price: price as number },
  ],
}));

export async function seedMinerDemoData(organizationId: string) {
  const supabase = admin();
  await supabase.from("miner_products").delete().eq("organization_id", organizationId).eq("demo", true);
  for (const demo of demoProducts) {
    const { snapshots, ...product } = demo;
    const saved = await saveCollectedProduct(organizationId, null, product);
    await supabase.from("miner_products").update({ demo: true }).eq("id", saved.id);
    await supabase.from("miner_product_snapshots").delete().eq("product_id", saved.id);
    await supabase.from("miner_product_snapshots").insert(
      snapshots.map((snapshot) => ({
        organization_id: organizationId,
        product_id: saved.id,
        keyword: product.keyword,
        price: snapshot.price,
        original_price: null,
        sold_quantity: snapshot.sold,
        rating: product.rating,
        review_count: product.review_count,
        search_position: product.search_position,
        sponsored: product.sponsored,
        collected_at: new Date(Date.now() - snapshot.daysAgo * 86_400_000).toISOString(),
        data_source: "MANUAL",
        raw_payload: { demo: true },
      }))
    );
  }
  await recalculateMinerScores(organizationId);
}

export async function getMinerProductDetail(organizationId: string, id: string) {
  const supabase = admin();
  const [{ data: product, error }, { data: snapshots }, { data: score }, { data: classification }, { data: favorite }] = await Promise.all([
    supabase.from("miner_products").select("*").eq("organization_id", organizationId).eq("id", id).single(),
    supabase.from("miner_product_snapshots").select("*").eq("organization_id", organizationId).eq("product_id", id).order("collected_at", { ascending: false }),
    supabase.from("miner_opportunity_scores").select("*").eq("organization_id", organizationId).eq("product_id", id).maybeSingle(),
    supabase.from("miner_product_classifications").select("*").eq("organization_id", organizationId).eq("product_id", id).maybeSingle(),
    supabase.from("miner_favorites").select("*").eq("organization_id", organizationId).eq("product_id", id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  return { product: product as any, snapshots: (snapshots ?? []) as any[], score: score as any, classification: classification as any, favorite: favorite as any };
}

export async function listMinerJobs(organizationId: string) {
  const { data, error } = await admin()
    .from("miner_collection_jobs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  return data ?? [];
}
