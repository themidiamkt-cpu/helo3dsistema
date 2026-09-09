import type { MarketplaceAdapter } from "./base";
import { MarketplaceAdapterError } from "./base";

export const shopeeAdapter: MarketplaceAdapter = {
  marketplace: "SHOPEE",
  async search() {
    throw new MarketplaceAdapterError(
      "Shopee precisa de adapter autenticado/API aprovada para coleta confiavel. O modulo nao usa scraping nem inventa vendas."
    );
  },
};
