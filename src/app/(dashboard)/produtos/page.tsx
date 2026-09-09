import { Package } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { ProductActions } from "@/components/products/product-actions";
import { ProductForm } from "@/components/products/product-form";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listTable } from "@/lib/data/queries";
import { formatCurrency } from "@/lib/formatters";
import { getCurrentProfile } from "@/lib/supabase/session";

export default async function ProductsPage() {
  const { supabase, profile } = await getCurrentProfile();
  const [productsData, printersData, filamentsData, suppliesData, productFilamentsData, productSuppliesData, settingsData] = await Promise.all([
    listTable("products"),
    listTable("printers"),
    listTable("filaments"),
    listTable("inventory_supplies"),
    supabase.from("product_filaments").select("*").eq("organization_id", profile.organization_id ?? ""),
    supabase.from("product_supplies").select("*").eq("organization_id", profile.organization_id ?? ""),
    supabase.from("organization_settings").select("*").eq("organization_id", profile.organization_id ?? "").single(),
  ]);
  const products = productsData.filter((item) => item.active);
  const printers = printersData.filter((item) => item.active);
  const filaments = filamentsData.filter((item) => item.active);
  const supplies = suppliesData.filter((item) => item.active);
  return (
    <PageShell title="Produtos" description="Produtos acabados, estoque, custo unitario e preco de venda.">
      <ProductForm printers={printers} filaments={filaments} supplies={supplies} settings={settingsData.data} />
      {products.length ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Custo unitario</TableHead>
                <TableHead>Preco</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((item) => {
                const salePrice = item.manual_sale_price ?? item.calculated_sale_price;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.sku ?? "-"}</TableCell>
                    <TableCell>{item.category ?? "-"}</TableCell>
                    <TableCell>{item.finished_stock_quantity}</TableCell>
                    <TableCell>{formatCurrency(item.calculated_unit_cost)}</TableCell>
                    <TableCell>{formatCurrency(salePrice)}</TableCell>
                    <TableCell>{formatCurrency(salePrice - item.calculated_unit_cost)}</TableCell>
                    <TableCell><Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Ativo" : "Inativo"}</Badge></TableCell>
                    <TableCell>
                      <ProductActions
                        product={item}
                        printers={printers}
                        filaments={filaments}
                        productFilaments={productFilamentsData.data ?? []}
                        supplies={supplies}
                        productSupplies={productSuppliesData.data ?? []}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Package} title="Nenhum produto cadastrado" description="Salve um produto com composicao para criar ordens e controlar estoque acabado." />
      )}
    </PageShell>
  );
}
