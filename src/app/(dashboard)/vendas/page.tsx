import { ReceiptText } from "lucide-react";
import { createSalesChannelAction } from "@/actions/records";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleFormCard } from "@/components/layout/simple-form-card";
import { ChannelActions } from "@/components/sales/channel-actions";
import { SaleForm } from "@/components/sales/sale-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { parseSalesChannels } from "@/lib/sales/channels";
import { getCurrentProfile } from "@/lib/supabase/session";

export default async function SalesPage() {
  const { supabase, profile } = await getCurrentProfile();
  const [productsData, sales, saleItems, settingsResult] = await Promise.all([
    listTable("products"),
    listTable("sales"),
    listTable("sale_items"),
    supabase.from("organization_settings").select("rounding_rule").eq("organization_id", profile.organization_id ?? "").single(),
  ]);
  const products = productsData.filter((product) => product.active);
  const productById = new Map(productsData.map((product) => [product.id, product]));
  const itemBySaleId = new Map(saleItems.map((item) => [item.sale_id, item]));
  const channels = parseSalesChannels(settingsResult.data?.rounding_rule).filter((channel) => channel.active);

  return (
    <PageShell title="Vendas" description="Lance vendas, aplique taxas do canal e baixe o estoque acabado.">
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Nova venda</CardTitle>
          </CardHeader>
          <CardContent>
            <SaleForm products={products} channels={channels} />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <SimpleFormCard
            title="Novo canal"
            action={createSalesChannelAction}
            submitLabel="Cadastrar canal"
            fields={[
              { name: "name", label: "Canal", placeholder: "Shopee, Instagram, Mercado Livre" },
              { name: "fee_percentage", label: "Taxa %", type: "number", defaultValue: 0 },
              { name: "fixed_fee", label: "Taxa fixa", type: "number", defaultValue: 0 },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Canais</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.length ? (
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Canal</TableHead>
                        <TableHead>Taxas</TableHead>
                        <TableHead className="w-12 text-right">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">{channel.name}</TableCell>
                          <TableCell>{channel.fee_percentage}% + {formatCurrency(channel.fixed_fee)}</TableCell>
                          <TableCell className="text-right">
                            <ChannelActions id={channel.id} name={channel.name} feePercentage={channel.fee_percentage} fixedFee={channel.fixed_fee} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Cadastre o primeiro canal para lancar vendas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {sales.length ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Liquido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => {
                const item = itemBySaleId.get(sale.id);
                const product = item ? productById.get(item.product_id) : null;
                return (
                  <TableRow key={sale.id}>
                    <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                    <TableCell className="font-medium">{product?.name ?? "Produto removido"}</TableCell>
                    <TableCell>{sale.payment_method ?? "-"}</TableCell>
                    <TableCell>{item?.quantity ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(sale.subtotal)}</TableCell>
                    <TableCell>{formatCurrency(sale.platform_fee)}</TableCell>
                    <TableCell>{formatCurrency(sale.total)}</TableCell>
                    <TableCell><Badge variant="secondary">{sale.status === "completed" ? "Concluida" : sale.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={ReceiptText} title="Nenhuma venda lancada" description="Quando vender um produto acabado, registre aqui para baixar o estoque." />
      )}
    </PageShell>
  );
}
