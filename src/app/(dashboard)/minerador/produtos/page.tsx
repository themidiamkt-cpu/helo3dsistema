import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { MinerProductTable } from "@/components/miner/product-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinerContext, getMinerProducts } from "@/lib/miner/repository";

export default async function MinerProductsPage() {
  const { organizationId } = await getMinerContext();
  const products = await getMinerProducts(organizationId);
  return (
    <PageShell title="Produtos Minerados" description="Catalogo normalizado vindo das coletas.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>{products.length} produtos</CardTitle>
        </CardHeader>
        <CardContent>{products.length ? <MinerProductTable products={products} /> : <p className="text-sm text-muted-foreground">Sem produtos minerados.</p>}</CardContent>
      </Card>
    </PageShell>
  );
}
