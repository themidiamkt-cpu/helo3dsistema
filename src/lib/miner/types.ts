export type MinerMarketplace = "SHOPEE" | "MERCADO_LIVRE";
export type MinerDataSource = "OFFICIAL_API" | "PAGE_PUBLIC_DATA" | "HISTORICAL_ESTIMATE" | "AI_ESTIMATE" | "MANUAL";
export type MinerTrend = "TRENDING_UP" | "STABLE" | "TRENDING_DOWN" | "INSUFFICIENT_DATA";
export type MinerLifecycle = "NEW" | "EMERGING" | "HOT" | "STABLE" | "SATURATED" | "DECLINING";

export type NormalizedMarketplaceProduct = {
  marketplace: MinerMarketplace;
  external_id: string | null;
  title: string;
  url: string;
  image_url: string | null;
  price: number | null;
  original_price: number | null;
  sold_quantity: number | null;
  rating: number | null;
  review_count: number | null;
  seller_name: string | null;
  seller_url: string | null;
  location: string | null;
  keyword: string;
  search_position: number | null;
  sponsored: boolean | null;
  collected_at: string;
  data_source: MinerDataSource;
  raw_payload?: unknown;
};

export type MinerSnapshot = {
  price: number | null;
  sold_quantity: number | null;
  rating?: number | null;
  review_count?: number | null;
  search_position?: number | null;
  sponsored?: boolean | null;
  collected_at: string;
  data_source: MinerDataSource;
};

export type MinerClassification = {
  probability_3d_printed: number;
  likely_manufacturing: "FDM" | "RESIN" | "INJECTION" | "OTHER" | "UNKNOWN";
  print_complexity: "LOW" | "MEDIUM" | "HIGH";
  estimated_print_difficulty: number;
  confidence: number;
};

export type MinerScoreInput = {
  price: number | null;
  sales7d: number | null;
  sales30d: number | null;
  revenue30d: number | null;
  competitorCount: number;
  probability3dPrinted: number | null;
  printDifficulty: number | null;
  reviewCount: number | null;
  rating: number | null;
  firstSeenAt: string;
};

export type MinerScoreWeights = {
  demand: number;
  growth: number;
  competition: number;
  commercial: number;
  productionEase: number;
  quality: number;
};
