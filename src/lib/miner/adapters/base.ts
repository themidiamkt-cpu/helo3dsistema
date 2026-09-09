import type { MinerMarketplace, NormalizedMarketplaceProduct } from "@/lib/miner/types";

export type MarketplaceSearchParams = {
  keyword: string;
  limit: number;
};

export type MarketplaceAdapter = {
  marketplace: MinerMarketplace;
  search(params: MarketplaceSearchParams): Promise<NormalizedMarketplaceProduct[]>;
};

export class MarketplaceAdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketplaceAdapterError";
  }
}
