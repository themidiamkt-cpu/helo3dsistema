import { describe, expect, it } from "vitest";
import { calculateOpportunityScore, canonicalUrl, classifyTrend, estimateSalesFromHistory, normalizeTitle } from "./metrics";

describe("miner metrics", () => {
  it("calcula vendas estimadas usando historico", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const snapshots = [
      { sold_quantity: 10, price: 20, collected_at: "2026-08-01T12:00:00Z", data_source: "PAGE_PUBLIC_DATA" as const },
      { sold_quantity: 25, price: 20, collected_at: "2026-08-24T10:00:00Z", data_source: "PAGE_PUBLIC_DATA" as const },
      { sold_quantity: 40, price: 20, collected_at: "2026-08-31T10:00:00Z", data_source: "PAGE_PUBLIC_DATA" as const },
    ];
    expect(estimateSalesFromHistory(snapshots, 7, now)).toBe(15);
    expect(estimateSalesFromHistory(snapshots, 30, now)).toBe(30);
  });

  it("retorna null quando nao existe historico suficiente", () => {
    expect(estimateSalesFromHistory([{ sold_quantity: 10, price: 20, collected_at: "2026-08-31T10:00:00Z", data_source: "PAGE_PUBLIC_DATA" }], 7, new Date("2026-08-31T12:00:00Z"))).toBeNull();
  });

  it("classifica tendencia de crescimento", () => {
    expect(classifyTrend(20, 35)).toBe("TRENDING_UP");
    expect(classifyTrend(null, 35)).toBe("INSUFFICIENT_DATA");
  });

  it("normaliza titulo e url para deduplicacao segura", () => {
    expect(normalizeTitle("Kit Ovo Fidget Articulado 3D - Frete Gratis")).toBe("ovo fidget articulado 3d");
    expect(canonicalUrl("https://x.test/a?utm_source=ads&id=1#foto")).toBe("https://x.test/a?id=1");
  });

  it("gera score auditavel", () => {
    const result = calculateOpportunityScore({
      price: 49.9,
      sales7d: 18,
      sales30d: 42,
      revenue30d: 2095.8,
      competitorCount: 3,
      probability3dPrinted: 88,
      printDifficulty: 30,
      reviewCount: 80,
      rating: 4.7,
      firstSeenAt: "2026-08-25T00:00:00Z",
    });
    expect(result.score).toBeGreaterThan(60);
    expect(result.trend).toBe("TRENDING_UP");
  });
});
