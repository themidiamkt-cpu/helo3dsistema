import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { MinerProductTable } from "@/components/miner/product-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinerContext, getMinerProducts } from "@/lib/miner/repository";

export default async function MinerEmergingPage() {
  const { organizationId } = await getMinerContext();
  const products = await getMinerProducts(organizationId, { emergingOnly: true });
  return (
    <PageShell title="Emergentes" description="Itens novos, quentes ou subindo nas estimativas historicas.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Produtos para observar</CardTitle>
        </CardHeader>
        <CardContent>{products.length ? <MinerProductTable products={products} /> : <p className="text-sm text-muted-foreground">Ainda sem historico suficiente.</p>}</CardContent>
      </Card>
    </PageShell>
  );
}
