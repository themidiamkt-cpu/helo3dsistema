import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { MinerProductTable } from "@/components/miner/product-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinerContext, getMinerProducts } from "@/lib/miner/repository";

export default async function MinerFavoritesPage() {
  const { organizationId } = await getMinerContext();
  const products = await getMinerProducts(organizationId, { favoritesOnly: true });
  return (
    <PageShell title="Favoritos" description="Produtos separados para teste, STL, prototipo ou producao.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Favoritos</CardTitle>
        </CardHeader>
        <CardContent>{products.length ? <MinerProductTable products={products} /> : <p className="text-sm text-muted-foreground">Nenhum favorito ainda.</p>}</CardContent>
      </Card>
    </PageShell>
  );
}
