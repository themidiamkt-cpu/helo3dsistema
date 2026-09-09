import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { MinerProductTable } from "@/components/miner/product-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinerContext, getMinerProducts } from "@/lib/miner/repository";

export default async function OportunidadesPage() {
  const { organizationId } = await getMinerContext();
  const products = await getMinerProducts(organizationId, { opportunitiesOnly: true });
  return (
    <PageShell title="Oportunidades" description="Produtos ranqueados por demanda, tendencia, concorrencia e facilidade de producao.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Fila de analise</CardTitle>
        </CardHeader>
        <CardContent>{products.length ? <MinerProductTable products={products} /> : <p className="text-sm text-muted-foreground">Nenhuma oportunidade calculada.</p>}</CardContent>
      </Card>
    </PageShell>
  );
}
