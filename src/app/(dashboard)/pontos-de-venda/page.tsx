import Link from "next/link";
import { Download, MapPin, PackagePlus, Printer, QrCode, Store, TrendingUp } from "lucide-react";
import {
  createSalesPointAction,
  transferToSalesPointAction,
  updateSalesPointAction,
  withdrawFromSalesPointAction,
} from "@/actions/sales-points";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { getCurrentProfile } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";
import type { Product, SalesPoint, SalesPointCommission, SalesPointMovement, SalesPointQRCode, SalesPointSale, SalesPointStock } from "@/types/database";
import type { LucideIcon } from "lucide-react";

function publicUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/pdv/${token}`;
}

function statusLabel(status: SalesPoint["status"]) {
  return status === "active" ? "Ativo" : "Inativo";
}

function productPrice(product: Product | undefined) {
  return Number(product?.manual_sale_price ?? product?.calculated_sale_price ?? 0);
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function SalesPointForm({ point }: { point?: SalesPoint }) {
  return (
    <form action={point ? updateSalesPointAction : createSalesPointAction} className="grid gap-4">
      {point ? <input type="hidden" name="id" value={point.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field name="name" label="Nome" defaultValue={point?.name} />
        <Field name="company_name" label="Empresa" defaultValue={point?.company_name} />
        <Field name="responsible_name" label="Responsavel" defaultValue={point?.responsible_name} />
        <Field name="phone" label="Telefone" defaultValue={point?.phone} />
        <Field name="email" label="Email" defaultValue={point?.email} type="email" />
        <Field name="commission_percentage" label="Comissao %" defaultValue={point?.commission_percentage ?? 10} type="number" />
        <Field name="city" label="Cidade" defaultValue={point?.city} />
        <Field name="state" label="Estado" defaultValue={point?.state} />
      </div>
      <Field name="address" label="Endereco" defaultValue={point?.address} />
      <div className="grid gap-1.5">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={point?.status ?? "active"} className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Observacoes</Label>
        <Textarea id="notes" name="notes" defaultValue={point?.notes ?? ""} />
      </div>
      <Button type="submit">{point ? "Salvar alteracoes" : "Cadastrar ponto"}</Button>
    </form>
  );
}

function TransferForm({ points, products, mode }: { points: SalesPoint[]; products: Product[]; mode: "transfer" | "withdraw" }) {
  const isTransfer = mode === "transfer";

  return (
    <form action={isTransfer ? transferToSalesPointAction : withdrawFromSalesPointAction} className="grid gap-4 rounded-md border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{isTransfer ? "Abastecer ponto" : "Recolher para estoque principal"}</p>
          <p className="text-xs text-muted-foreground">
            {isTransfer ? "Sai do estoque principal e entra no PDV." : "Sai do PDV e volta para o estoque principal."}
          </p>
        </div>
        <Badge variant={isTransfer ? "secondary" : "outline"}>{isTransfer ? "Envio" : "Retirada"}</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[190px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-1.5">
          <Label>Ponto</Label>
          <select name="sales_point_id" className="h-9 min-w-0 rounded-lg border bg-background px-2 text-sm" required>
            {points.length ? null : <option value="">Cadastre um ponto</option>}
            {points.map((point) => (
              <option key={point.id} value={point.id}>
                {point.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <Label>Produto</Label>
          <select name="product_id" className="h-9 min-w-0 rounded-lg border bg-background px-2 text-sm" required>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - estoque {product.finished_stock_quantity}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={cn("grid gap-3", isTransfer ? "sm:grid-cols-[120px_140px_minmax(0,1fr)]" : "sm:grid-cols-[120px_minmax(0,1fr)]")}>
        <Field name="quantity" label="Qtd." type="number" defaultValue={1} />
        {isTransfer ? <Field name="minimum_quantity" label="Minimo PDV" type="number" defaultValue={0} /> : <input type="hidden" name="minimum_quantity" value="0" />}
        <Field name="reason" label="Motivo" defaultValue={isTransfer ? "Abastecimento PDV" : "Retirada PDV"} className="min-w-0" />
      </div>

      <Button type="submit" variant={isTransfer ? "default" : "outline"} className="w-full">
        {isTransfer ? "Enviar para ponto" : "Recolher"}
      </Button>
    </form>
  );
}

function SalesPointStockTable({
  stock,
  pointById,
  productById,
}: {
  stock: SalesPointStock[];
  pointById: Map<string, SalesPoint>;
  productById: Map<string, Product>;
}) {
  if (!stock.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nenhum produto enviado para ponto ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ponto</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Saldo PDV</TableHead>
            <TableHead>Minimo</TableHead>
            <TableHead>Estoque principal</TableHead>
            <TableHead>Valor PDV</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stock.map((item) => {
            const product = productById.get(item.product_id);
            return (
              <TableRow key={item.id}>
                <TableCell>{pointById.get(item.sales_point_id)?.name ?? "-"}</TableCell>
                <TableCell className="min-w-72 font-medium">{product?.name ?? "Produto removido"}</TableCell>
                <TableCell>
                  {item.quantity} {item.quantity <= item.minimum_quantity ? <Badge variant="destructive">Baixo</Badge> : null}
                </TableCell>
                <TableCell>{item.minimum_quantity}</TableCell>
                <TableCell>{product?.finished_stock_quantity ?? 0}</TableCell>
                <TableCell>{formatCurrency(productPrice(product) * item.quantity)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SalesPointTabs() {
  return (
    <TabsList className="w-full justify-start overflow-x-auto rounded-md">
      <TabsTrigger value="dashboard" className="min-w-32">Dashboard</TabsTrigger>
      <TabsTrigger value="pontos" className="min-w-28">Pontos</TabsTrigger>
      <TabsTrigger value="produtos" className="min-w-32">Produtos</TabsTrigger>
      <TabsTrigger value="qrcodes" className="min-w-32">QR Codes</TabsTrigger>
      <TabsTrigger value="vendas" className="min-w-28">Vendas</TabsTrigger>
      <TabsTrigger value="comissoes" className="min-w-36">Comissoes</TabsTrigger>
    </TabsList>
  );
}
export default async function SalesPointsPage() {
  const { supabase, profile } = await getCurrentProfile();
  const orgId = profile.organization_id ?? "";

  const [pointsResult, productsResult, stockResult, qrResult, salesResult, commissionsResult, movementsResult] = await Promise.all([
    supabase.from("sales_points").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("products").select("*").eq("organization_id", orgId).eq("active", true).order("name"),
    supabase.from("sales_point_stock").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("sales_point_qrcodes").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("sales_point_sales").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("sales_point_commissions").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("sales_point_movements").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(80),
  ]);

  const setupError = [pointsResult, stockResult, qrResult, salesResult, commissionsResult, movementsResult]
    .map((result) => result.error)
    .find((error) => error);

  if (setupError) {
    return (
      <PageShell title="Pontos de Venda" description="Controle pontos externos, estoque dedicado, QR Codes, Pix e comissoes.">
        <Card>
          <CardHeader>
            <CardTitle>Modulo aguardando migracao do banco</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>O servidor esta rodando, mas as tabelas do modulo Pontos de Venda ainda nao existem no Supabase conectado.</p>
            <p className="rounded-md bg-muted p-3 font-mono text-xs">
              /Users/themidia/Documents/projeto 3d/supabase/migrations/20260727183445_sales_points_module.sql
            </p>
            <p className="text-muted-foreground">Abra o SQL Editor do Supabase desse projeto, cole esse arquivo inteiro e execute. Depois recarregue esta pagina.</p>
            <p className="text-xs text-muted-foreground">Erro recebido: {setupError.message}</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const points = (pointsResult.data ?? []) as SalesPoint[];
  const products = (productsResult.data ?? []) as Product[];
  const stock = (stockResult.data ?? []) as SalesPointStock[];
  const qrcodes = (qrResult.data ?? []) as SalesPointQRCode[];
  const sales = (salesResult.data ?? []) as SalesPointSale[];
  const commissions = (commissionsResult.data ?? []) as SalesPointCommission[];
  const movements = (movementsResult.data ?? []) as SalesPointMovement[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const pointById = new Map(points.map((point) => [point.id, point]));
  const completedSales = sales.filter((sale) => sale.status === "completed");
  const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const commissionPayable = commissions.filter((item) => item.status === "payable").reduce((sum, item) => sum + Number(item.commission_amount), 0);
  const available = stock.reduce((sum, item) => sum + item.quantity, 0);
  const lowStock = stock.filter((item) => item.quantity <= item.minimum_quantity);
  const ticket = completedSales.length ? revenue / completedSales.length : 0;
  const summaryCards: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: "Pontos ativos", value: points.filter((point) => point.status === "active").length, Icon: Store },
    { label: "Produtos nos pontos", value: available, Icon: PackagePlus },
    { label: "Receita PDV", value: formatCurrency(revenue), Icon: TrendingUp },
    { label: "Comissao a pagar", value: formatCurrency(commissionPayable), Icon: MapPin },
    { label: "Ticket medio", value: formatCurrency(ticket), Icon: QrCode },
  ];

  return (
    <PageShell title="Pontos de Venda" description="Controle pontos externos, estoque dedicado, QR Codes, Pix e comissoes.">
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger render={<Button />}>
            <Store className="size-4" /> Novo ponto
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Novo ponto de venda</DialogTitle>
            </DialogHeader>
            <SalesPointForm />
          </DialogContent>
        </Dialog>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/pontos-de-venda/qrcodes/print">
          <Printer className="size-4" /> Imprimir QRs A4
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/pontos-de-venda/relatorio.csv">
          <Download className="size-4" /> Excel/CSV
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline" }))} href="/pontos-de-venda/relatorio.pdf">
          <Download className="size-4" /> PDF
        </Link>
      </div>

      <Tabs defaultValue="dashboard">
        <SalesPointTabs />

        <TabsContent value="dashboard" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map(({ label, value, Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                  <Icon className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Produtos por ponto</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Ponto</TableHead><TableHead>Produto</TableHead><TableHead>Saldo</TableHead><TableHead>Alerta</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {stock.slice(0, 12).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{pointById.get(item.sales_point_id)?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium">{productById.get(item.product_id)?.name ?? "Produto removido"}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.quantity <= item.minimum_quantity ? <Badge variant="destructive">Repor</Badge> : <Badge variant="secondary">OK</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Ultimas vendas PDV</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Ponto</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {sales.slice(0, 12).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                        <TableCell>{productById.get(sale.product_id)?.name ?? "-"}</TableCell>
                        <TableCell>{pointById.get(sale.sales_point_id)?.name ?? "-"}</TableCell>
                        <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          {lowStock.length ? <Card><CardContent className="p-4 text-sm">Alertas: {lowStock.map((item) => `${pointById.get(item.sales_point_id)?.name ?? "Ponto"} / ${productById.get(item.product_id)?.name ?? "Produto"}`).join("; ")}</CardContent></Card> : null}
        </TabsContent>

        <TabsContent value="pontos">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Ponto</TableHead><TableHead>Responsavel</TableHead><TableHead>Cidade</TableHead><TableHead>Comissao</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Acoes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {points.map((point) => (
                    <TableRow key={point.id}>
                      <TableCell className="font-medium">{point.name}<div className="text-xs text-muted-foreground">{point.company_name}</div></TableCell>
                      <TableCell>{point.responsible_name ?? "-"}</TableCell>
                      <TableCell>{[point.city, point.state].filter(Boolean).join(" / ") || "-"}</TableCell>
                      <TableCell>{point.commission_percentage}%</TableCell>
                      <TableCell><Badge variant={point.status === "active" ? "secondary" : "outline"}>{statusLabel(point.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger render={<Button variant="outline" size="sm" />}>Editar</DialogTrigger>
                          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                            <DialogHeader><DialogTitle>Editar ponto</DialogTitle></DialogHeader>
                            <SalesPointForm point={point} />
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos" className="grid gap-4">
          <Card>
            <CardContent>
              <div className="mb-4">
                <CardTitle>Movimentar estoque do ponto</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Abasteca o PDV ou recolha produtos sem misturar com vendas.
                </p>
              </div>
              <div className="grid gap-4 2xl:grid-cols-2">
                <TransferForm points={points.filter((point) => point.status === "active")} products={products} mode="transfer" />
                <TransferForm points={points} products={products} mode="withdraw" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Estoque por ponto</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesPointStockTable stock={stock} pointById={pointById} productById={productById} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrcodes">
          <Card>
            <CardHeader><CardTitle>QR Codes publicos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Ponto</TableHead><TableHead>Produto</TableHead><TableHead>Token</TableHead><TableHead>Link</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {qrcodes.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell>{pointById.get(qr.sales_point_id)?.name ?? "-"}</TableCell>
                      <TableCell className="font-medium">{productById.get(qr.product_id)?.name ?? "-"}</TableCell>
                      <TableCell>{qr.token}</TableCell>
                      <TableCell><Link className="text-primary underline-offset-4 hover:underline" href={`/pdv/${qr.token}`}>{publicUrl(qr.token)}</Link></TableCell>
                      <TableCell><Badge variant={qr.status === "active" ? "secondary" : "outline"}>{qr.status === "active" ? "Ativo" : "Inativo"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Valor</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Pix</TableHead><TableHead>Comissao</TableHead><TableHead>Ponto</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{formatDateTime(sale.created_at)}</TableCell>
                      <TableCell className="font-medium">{productById.get(sale.product_id)?.name ?? "-"}</TableCell>
                      <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                      <TableCell>{sale.customer_name ?? "-"}</TableCell>
                      <TableCell><Badge variant={sale.status === "completed" ? "secondary" : sale.status === "pending" ? "outline" : "destructive"}>{sale.status}</Badge></TableCell>
                      <TableCell>{sale.payment_status}</TableCell>
                      <TableCell>{formatCurrency(sale.commission_amount)}</TableCell>
                      <TableCell>{pointById.get(sale.sales_point_id)?.name ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="grid gap-4">
          <Card>
            <CardHeader><CardTitle>Comissoes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Ponto</TableHead><TableHead>Venda</TableHead><TableHead>Percentual</TableHead><TableHead>Bruto</TableHead><TableHead>Comissao</TableHead><TableHead>Empresa</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>{formatDateTime(commission.created_at)}</TableCell>
                      <TableCell>{pointById.get(commission.sales_point_id)?.name ?? "-"}</TableCell>
                      <TableCell>{commission.sale_id.slice(0, 8)}</TableCell>
                      <TableCell>{commission.percentage}%</TableCell>
                      <TableCell>{formatCurrency(commission.gross_amount)}</TableCell>
                      <TableCell>{formatCurrency(commission.commission_amount)}</TableCell>
                      <TableCell>{formatCurrency(commission.company_amount)}</TableCell>
                      <TableCell><Badge variant="secondary">{commission.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Historico de movimentacoes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Qtd.</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                      <TableCell>{productById.get(movement.product_id)?.name ?? "-"}</TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.origin ?? "-"}</TableCell>
                      <TableCell>{movement.destination ?? "-"}</TableCell>
                      <TableCell>{movement.reason ?? movement.movement_type}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
