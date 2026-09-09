import Link from "next/link";
import { ArrowUpRight, Clock, Database, Search, Star, Target, Zap } from "lucide-react";
import { CollectForm } from "@/components/miner/collect-form";
import { money } from "@/components/miner/formatters";
import { MinerNav } from "@/components/miner/miner-nav";
import { MinerProductTable } from "@/components/miner/product-table";
import { SeedMinerButton } from "@/components/miner/seed-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout/page-shell";
import { getMinerContext, getMinerDashboard, getMinerProducts } from "@/lib/miner/repository";

function Stat({ title, value, icon: Icon }: { title: string; value: string | number; icon: typeof Target }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export default async function MineradorPage() {
  const { organizationId } = await getMinerContext();
  const [dashboard, opportunities] = await Promise.all([getMinerDashboard(organizationId), getMinerProducts(organizationId, { opportunitiesOnly: true })]);
  const top = opportunities.slice(0, 10);
  const monitoredValue = top.reduce((sum, item) => sum + (item.latest_price ?? 0) * (item.latest_sold_quantity ?? 0), 0);

  return (
    <PageShell title="Minerador 3D" description="Monitore marketplaces e encontre produtos com cara de impressao FDM.">
      <MinerNav />
      <div className="flex flex-wrap gap-2">
        <SeedMinerButton />
        <Button variant="outline" render={<Link href="/minerador/keywords" />}>
          <Search className="size-4" />
          Keywords
        </Button>
        <Button variant="outline" render={<Link href="/oportunidades" />}>
          <ArrowUpRight className="size-4" />
          Ver oportunidades
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat title="Monitorados" value={dashboard.products} icon={Database} />
        <Stat title="Oportunidades" value={dashboard.opportunityCount} icon={Target} />
        <Stat title="Emergentes" value={dashboard.emergingCount} icon={Zap} />
        <Stat title="Keywords ativas" value={dashboard.activeKeywords} icon={Search} />
        <Stat title="Favoritos" value={dashboard.favorites} icon={Star} />
        <Stat title="Jobs em fila" value={dashboard.runningJobs} icon={Clock} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coleta manual</CardTitle>
        </CardHeader>
        <CardContent>
          <CollectForm />
          <p className="mt-2 text-xs text-muted-foreground">
            Mercado Livre usa API publica. Shopee fica registrado como job sem coleta ate conectar API/adapter confiavel.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Top oportunidades</CardTitle>
            <p className="text-sm text-muted-foreground">Potencial monitorado: {money(monitoredValue)}</p>
          </div>
          {dashboard.demoProducts ? <Badge variant="outline">{dashboard.demoProducts} demo</Badge> : null}
        </CardHeader>
        <CardContent>{top.length ? <MinerProductTable products={top} /> : <p className="text-sm text-muted-foreground">Sem dados ainda. Clique em Dados demo ou rode uma coleta.</p>}</CardContent>
      </Card>
    </PageShell>
  );
}
