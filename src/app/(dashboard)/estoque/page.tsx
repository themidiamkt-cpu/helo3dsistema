import { Layers3 } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDecimal, formatWeight } from "@/lib/formatters";

export default async function StockPage() {
  const [productsData, filamentsData, suppliesData] = await Promise.all([
    listTable("products"),
    listTable("filaments"),
    listTable("inventory_supplies"),
  ]);
  const products = productsData.filter((item) => item.active);
  const filaments = filamentsData.filter((item) => item.active);
  const supplies = suppliesData.filter((item) => item.active);

  return (
    <PageShell title="Estoque" description="Saldos de produtos acabados, filamentos e componentes.">
      <Tabs defaultValue="produtos">
        <TabsList className="flex w-full max-w-xl">
          <TabsTrigger value="produtos">Produtos acabados</TabsTrigger>
          <TabsTrigger value="filamentos">Filamentos</TabsTrigger>
          <TabsTrigger value="componentes">Componentes</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos">
          {products.length ? <Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>Saldo</TableHead><TableHead>Valor</TableHead><TableHead>Lucro potencial</TableHead></TableRow></TableHeader><TableBody>{products.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.finished_stock_quantity} {item.finished_stock_quantity <= item.minimum_finished_stock ? <Badge variant="destructive">Reposicao</Badge> : null}</TableCell><TableCell>{formatCurrency(item.finished_stock_quantity * item.calculated_unit_cost)}</TableCell><TableCell>{formatCurrency(item.finished_stock_quantity * ((item.manual_sale_price ?? item.calculated_sale_price) - item.calculated_unit_cost))}</TableCell></TableRow>)}</TableBody></Table> : <EmptyState icon={Layers3} title="Sem estoque acabado" description="Finalize producoes para alimentar este saldo." />}
        </TabsContent>
        <TabsContent value="filamentos">
          <Table><TableHeader><TableRow><TableHead>Filamento</TableHead><TableHead>Saldo</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{filaments.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{formatWeight(item.current_weight_grams)}</TableCell><TableCell>{formatCurrency(item.current_weight_grams * item.cost_per_gram)}</TableCell></TableRow>)}</TableBody></Table>
        </TabsContent>
        <TabsContent value="componentes">
          <Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Saldo</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{supplies.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{formatDecimal(item.current_quantity)} {item.unit}</TableCell><TableCell>{formatCurrency(item.current_quantity * item.unit_cost)}</TableCell></TableRow>)}</TableBody></Table>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
