import { canonicalUrl } from "@/lib/miner/metrics";
import type { NormalizedMarketplaceProduct } from "@/lib/miner/types";
import type { MarketplaceAdapter, MarketplaceSearchParams } from "./base";

type MercadoLivreResult = {
  id: string;
  title: string;
  permalink: string;
  thumbnail?: string;
  price?: number;
  original_price?: number | null;
  sold_quantity?: number;
  available_quantity?: number;
  condition?: string;
  seller?: { id?: number | string; nickname?: string };
  address?: { state_name?: string; city_name?: string };
};

type MercadoLivreSearchResponse = {
  results?: MercadoLivreResult[];
};

export const mercadoLivreAdapter: MarketplaceAdapter = {
  marketplace: "MERCADO_LIVRE",
  async search({ keyword, limit }: MarketplaceSearchParams) {
    const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
    url.searchParams.set("q", keyword);
    url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      throw new Error(`Mercado Livre retornou ${response.status}`);
    }

    const json = (await response.json()) as MercadoLivreSearchResponse;
    const now = new Date().toISOString();

    return (json.results ?? []).map<NormalizedMarketplaceProduct>((item, index) => ({
      marketplace: "MERCADO_LIVRE",
      external_id: item.id,
      title: item.title,
      url: canonicalUrl(item.permalink),
      image_url: item.thumbnail ?? null,
      price: item.price ?? null,
      original_price: item.original_price ?? null,
      sold_quantity: item.sold_quantity ?? null,
      rating: null,
      review_count: null,
      seller_name: item.seller?.nickname ?? null,
      seller_url: item.seller?.id ? `https://lista.mercadolivre.com.br/_CustId_${item.seller.id}` : null,
      location: [item.address?.city_name, item.address?.state_name].filter(Boolean).join(", ") || null,
      keyword,
      search_position: index + 1,
      sponsored: null,
      collected_at: now,
      data_source: "OFFICIAL_API",
      raw_payload: item,
    }));
  },
};
