import { AlertTriangle, Boxes, CircleDollarSign, Factory, Package, PackageCheck, Scale, TrendingUp } from "lucide-react";
import { addDemoDataAction } from "@/actions/records";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardData } from "@/lib/data/queries";
import { formatCurrency, formatDateTime, formatDecimal, formatMinutes, formatWeight } from "@/lib/formatters";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const lowFilaments = data.filaments.filter((item) => item.current_weight_grams <= item.minimum_stock_grams);
  const lowSupplies = data.supplies.filter((item) => item.current_quantity <= item.minimum_quantity);
  const productionOrders = data.orders.filter((item) => ["printing", "finishing", "slicing"].includes(item.status));
  const stockValue =
    data.filaments.reduce((sum, item) => sum + item.current_weight_grams * item.cost_per_gram, 0) +
    data.supplies.reduce((sum, item) => sum + item.current_quantity * item.unit_cost, 0) +
    data.products.reduce((sum, item) => sum + item.finished_stock_quantity * item.calculated_unit_cost, 0);
  const producedQuantity = data.finishedMovements.filter((item) => item.movement_type === "production_output").reduce((sum, item) => sum + item.quantity, 0);
  const monthlyCost = [{ month: "Atual", custo: data.orders.reduce((sum, item) => sum + (item.actual_total_cost ?? 0), 0), quantidade: producedQuantity }];
  const productById = new Map(data.products.map((product) => [product.id, product]));
  const productsWithStock = data.products
    .map((item) => {
      const salePrice = item.manual_sale_price ?? item.calculated_sale_price;
      return {
        ...item,
        salePrice,
        stockValue: item.finished_stock_quantity * item.calculated_unit_cost,
        potentialProfit: item.finished_stock_quantity * (salePrice - item.calculated_unit_cost),
      };
    })
    .sort((a, b) => b.finished_stock_quantity - a.finished_stock_quantity || a.name.localeCompare(b.name));
  const topStockOpportunities = productsWithStock
    .filter((item) => item.finished_stock_quantity > 0)
    .sort((a, b) => b.potentialProfit - a.potentialProfit)
    .slice(0, 6);
  const recentOrders = data.orders.slice(0, 6);
  const stockAlerts = [
    ...lowFilaments.map((item) => ({
      type: "Filamento",
      name: item.name,
      balance: formatWeight(item.current_weight_grams),
      minimum: formatWeight(item.minimum_stock_grams),
    })),
    ...lowSupplies.map((item) => ({
      type: "Componente",
      name: item.name,
      balance: `${formatDecimal(item.current_quantity)} ${item.unit}`,
      minimum: `${formatDecimal(item.minimum_quantity)} ${item.unit}`,
    })),
    ...data.products
      .filter((item) => item.finished_stock_quantity <= item.minimum_finished_stock)
      .map((item) => ({
        type: "Produto",
        name: item.name,
        balance: formatDecimal(item.finished_stock_quantity),
        minimum: formatDecimal(item.minimum_finished_stock),
      })),
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Indicadores de custo, estoque e producao.</p>
        </div>
        <form action={addDemoDataAction as () => void}>
          <Button type="submit" variant="outline">Adicionar dados de exemplo</Button>
        </form>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Produtos cadastrados" value={String(data.products.length)} icon={Package} />
        <StatCard title="Ordens em producao" value={String(productionOrders.length)} icon={Factory} />
        <StatCard title="Filamentos baixos" value={String(lowFilaments.length)} icon={AlertTriangle} />
        <StatCard title="Componentes baixos" value={String(lowSupplies.length)} icon={Boxes} />
        <StatCard title="Custo produzido no mes" value={formatCurrency(monthlyCost[0]?.custo)} icon={CircleDollarSign} />
        <StatCard title="Valor do estoque" value={formatCurrency(stockValue)} icon={TrendingUp} />
        <StatCard title="Quantidade produzida" value={String(producedQuantity)} icon={PackageCheck} />
        <StatCard title="Perdas no mes" value={formatWeight(data.filamentMovements.filter((item) => item.movement_type === "loss").reduce((sum, item) => sum + Math.abs(item.quantity), 0))} icon={Scale} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prioridade de venda</CardTitle>
          </CardHeader>
          <CardContent>
            {topStockOpportunities.length ? (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Preco</TableHead>
                      <TableHead>Lucro possivel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStockOpportunities.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{formatDecimal(item.finished_stock_quantity)}</TableCell>
                        <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                        <TableCell>{formatCurrency(item.potentialProfit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum produto acabado em estoque para vender.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ultimas ordens</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length ? (
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</div>
                        </TableCell>
                        <TableCell>{productById.get(order.product_id)?.name ?? "Produto removido"}</TableCell>
                        <TableCell><Badge variant="outline">{statusLabel(order.status)}</Badge></TableCell>
                        <TableCell>{formatMinutes(order.actual_minutes ?? order.estimated_minutes)}</TableCell>
                        <TableCell>{formatCurrency(order.actual_total_cost ?? order.estimated_total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma ordem cadastrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Produtos e estoque acabado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Custo unitario</TableHead>
                  <TableHead>Preco</TableHead>
                  <TableHead>Valor em estoque</TableHead>
                  <TableHead>Lucro potencial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsWithStock.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category ?? "-"}</TableCell>
                    <TableCell>
                      {formatDecimal(item.finished_stock_quantity)}
                      {item.finished_stock_quantity <= item.minimum_finished_stock ? <Badge variant="destructive" className="ml-2">Reposicao</Badge> : null}
                    </TableCell>
                    <TableCell>{formatCurrency(item.calculated_unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(item.salePrice)}</TableCell>
                    <TableCell>{formatCurrency(item.stockValue)}</TableCell>
                    <TableCell>{formatCurrency(item.potentialProfit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Alertas de estoque baixo</CardTitle>
        </CardHeader>
        <CardContent>
          {stockAlerts.length ? (
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Minimo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockAlerts.map((item) => (
                    <TableRow key={`${item.type}-${item.name}`}>
                      <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.balance}</TableCell>
                      <TableCell>{item.minimum}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum alerta no momento.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "Rascunho",
    waiting: "Aguardando",
    slicing: "Fatiando",
    printing: "Imprimindo",
    finishing: "Finalizando",
    completed: "Concluida",
    failed: "Falhou",
    cancelled: "Cancelada",
  };
  return labels[status] ?? status;
}
