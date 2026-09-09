import Link from "next/link";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildBlingProductRows, getBlingCategory, getBlingSalePrice, getBlingSku } from "@/lib/bling/export";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default async function BlingPage() {
  const products = (await listTable("products"))
    .filter((product) => product.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = buildBlingProductRows(products);
  const missingSku = products.filter((product) => !product.sku?.trim());

  return (
    <PageShell title="Bling" description="Exporte produtos e saldo atual para cadastro ou atualizacao no Bling.">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de produtos</CardTitle>
            <CardDescription>
              CSV no modelo do Bling com SKU, nome, preco, estoque atual, custo e descricao.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/bling/produtos.csv" className={cn(buttonVariants(), "gap-2")}>
              <Download className="size-4" />
              Exportar cadastro
            </Link>
            <Badge variant="outline">{rows.length} produtos</Badge>
            {missingSku.length ? <Badge variant="destructive">{missingSku.length} sem SKU</Badge> : <Badge variant="secondary">SKUs ok</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atualizacao de estoque</CardTitle>
            <CardDescription>
              Arquivo menor para atualizar saldo usando o SKU como codigo do produto.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/bling/estoque.csv" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
              <FileSpreadsheet className="size-4" />
              Exportar estoque atual
            </Link>
            <Badge variant="outline">{formatDecimal(products.reduce((sum, product) => sum + product.finished_stock_quantity, 0), 0)} unidades</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Previa do que vai para o Bling</CardTitle>
          <CardDescription>
            Confira principalmente SKU, estoque e preco antes de importar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria Bling</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Preco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">{getBlingSku(product)}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{getBlingCategory(product)}</TableCell>
                    <TableCell>{formatDecimal(product.finished_stock_quantity, 0)}</TableCell>
                    <TableCell>{formatCurrency(product.calculated_unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(getBlingSalePrice(product))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {missingSku.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Produtos sem SKU recebem um codigo temporario pelo ID no export. O ideal e preencher o SKU em Produtos antes de importar no Bling.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </PageShell>
  );
}
