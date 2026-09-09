import type { MinerMarketplace } from "@/lib/miner/types";
import type { MarketplaceAdapter } from "./base";
import { mercadoLivreAdapter } from "./mercado-livre";
import { shopeeAdapter } from "./shopee";

export const marketplaceAdapters: Record<MinerMarketplace, MarketplaceAdapter> = {
  MERCADO_LIVRE: mercadoLivreAdapter,
  SHOPEE: shopeeAdapter,
};
