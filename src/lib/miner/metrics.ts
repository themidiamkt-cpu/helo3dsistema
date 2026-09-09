import type { MinerLifecycle, MinerScoreInput, MinerScoreWeights, MinerSnapshot, MinerTrend } from "./types";

export const DEFAULT_MINER_SCORE_WEIGHTS: MinerScoreWeights = {
  demand: 35,
  growth: 20,
  competition: 15,
  commercial: 15,
  productionEase: 10,
  quality: 5,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(a: string, b = new Date().toISOString()) {
  const delta = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, delta / 86_400_000);
}

export function normalizeTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(kit|novo|promo|promocao|frete|gratis|pronta|entrega|unidades|unidade)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "sp_atk"].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

export function estimateSalesFromHistory(snapshots: MinerSnapshot[], days: 1 | 7 | 30, now = new Date()) {
  const sorted = snapshots
    .filter((item) => item.sold_quantity !== null && item.sold_quantity !== undefined)
    .sort((a, b) => new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime());

  const latest = sorted.at(-1);
  if (!latest?.sold_quantity && latest?.sold_quantity !== 0) return null;

  const targetTime = now.getTime() - days * 86_400_000;
  const baseline = [...sorted].reverse().find((item) => new Date(item.collected_at).getTime() <= targetTime);
  if (!baseline || baseline.sold_quantity === null || baseline.sold_quantity === undefined) return null;

  return Math.max(0, latest.sold_quantity - baseline.sold_quantity);
}

export function classifyTrend(sales7d: number | null, sales30d: number | null): MinerTrend {
  if (sales7d === null || sales30d === null || sales30d === 0) return "INSUFFICIENT_DATA";
  const previousDaily = Math.max(0, sales30d - sales7d) / 23;
  const recentDaily = sales7d / 7;
  if (recentDaily >= previousDaily * 1.35 && sales7d >= 3) return "TRENDING_UP";
  if (recentDaily <= previousDaily * 0.65) return "TRENDING_DOWN";
  return "STABLE";
}

export function classifyLifecycle(input: { firstSeenAt: string; trend: MinerTrend; competitorCount: number; sales7d: number | null; sales30d: number | null }): MinerLifecycle {
  const ageDays = daysBetween(input.firstSeenAt);
  if (input.trend === "TRENDING_DOWN") return "DECLINING";
  if (input.competitorCount >= 15 && (input.sales30d ?? 0) > 30) return "SATURATED";
  if (ageDays <= 14 && input.trend === "TRENDING_UP" && input.competitorCount <= 5) return "EMERGING";
  if (input.trend === "TRENDING_UP" && (input.sales7d ?? 0) >= 10) return "HOT";
  if (ageDays <= 7) return "NEW";
  return "STABLE";
}

export function calculateOpportunityScore(input: MinerScoreInput, weights: MinerScoreWeights = DEFAULT_MINER_SCORE_WEIGHTS) {
  const sales30d = input.sales30d ?? 0;
  const sales7d = input.sales7d ?? 0;
  const revenue30d = input.revenue30d ?? 0;
  const demandScore = clamp(sales30d * 2 + sales7d * 3 + revenue30d / 100);

  const trend = classifyTrend(input.sales7d, input.sales30d);
  const growthScore = trend === "TRENDING_UP" ? 90 : trend === "STABLE" ? 55 : trend === "TRENDING_DOWN" ? 20 : input.sales7d ? 45 : 10;
  const competitionScore = clamp(100 - input.competitorCount * 8);
  const commercialScore = clamp(((input.price ?? 0) / 150) * 70 + ((input.probability3dPrinted ?? 0) / 100) * 30);
  const productionEaseScore = clamp(100 - (input.printDifficulty ?? 55));
  const qualityScore = clamp((input.rating ?? 0) * 16 + Math.min(input.reviewCount ?? 0, 200) / 10);

  const totalWeight = Object.values(weights).reduce((sum, item) => sum + item, 0) || 100;
  const score =
    (demandScore * weights.demand +
      growthScore * weights.growth +
      competitionScore * weights.competition +
      commercialScore * weights.commercial +
      productionEaseScore * weights.productionEase +
      qualityScore * weights.quality) /
    totalWeight;

  const lifecycle = classifyLifecycle({ firstSeenAt: input.firstSeenAt, trend, competitorCount: input.competitorCount, sales7d: input.sales7d, sales30d: input.sales30d });

  return {
    score: Math.round(score * 100) / 100,
    demandScore: Math.round(demandScore * 100) / 100,
    growthScore: Math.round(growthScore * 100) / 100,
    competitionScore: Math.round(competitionScore * 100) / 100,
    commercialScore: Math.round(commercialScore * 100) / 100,
    productionEaseScore: Math.round(productionEaseScore * 100) / 100,
    qualityScore: Math.round(qualityScore * 100) / 100,
    trend,
    lifecycle,
    reasons: [
      input.sales30d === null ? "Historico insuficiente para vendas 30d." : `Vendas estimadas 30d: ${input.sales30d}.`,
      input.sales7d === null ? "Historico insuficiente para vendas 7d." : `Vendas estimadas 7d: ${input.sales7d}.`,
      `Concorrentes no cluster: ${input.competitorCount}.`,
    ],
  };
}
