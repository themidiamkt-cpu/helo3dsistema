import { Factory } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { AssemblyLaunchDialog } from "@/components/production/assembly-launch-dialog";
import { ProductionOrderActions } from "@/components/production/production-order-actions";
import { ProductionOrderForm } from "@/components/production/production-order-form";
import { ProductionOrderLifecycle } from "@/components/production/production-order-lifecycle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDateTime, formatMinutes } from "@/lib/formatters";
import { getCurrentProfile } from "@/lib/supabase/session";
import type { InventorySupply, Product, ProductionOrder } from "@/types/database";

type OrderPartGroup = {
  key: string;
  name: string;
  supplyId: string;
  supplyLabel: string;
  plannedQuantity: number;
  totalWeightGrams: number;
};

export default async function ProductionPage() {
  const { supabase, profile } = await getCurrentProfile();
  const [orders, products, printers, filaments, templates, suppliesData, productSupplies] = await Promise.all([
    listTable("production_orders"),
    listTable("products"),
    listTable("printers"),
    listTable("filaments"),
    supabase.from("product_filaments").select("*").eq("organization_id", profile.organization_id ?? ""),
    listTable("inventory_supplies"),
    supabase.from("product_supplies").select("*").eq("organization_id", profile.organization_id ?? ""),
  ]);
  const activeProducts = products.filter((item) => item.active);
  const activePrinters = printers.filter((item) => item.active);
  const activeFilaments = filaments.filter((item) => item.active);
  const activeSupplies = suppliesData.filter((item) => item.active);
  const productById = new Map(products.map((item) => [item.id, item]));
  return (
    <PageShell title="Producao" description="Crie ordens, inicie impressao e finalize com baixa de estoque.">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Nova ordem</CardTitle>
          <AssemblyLaunchDialog products={activeProducts} supplies={activeSupplies} productSupplies={productSupplies.data ?? []} />
        </CardHeader>
        <CardContent>
          <ProductionOrderForm
            products={activeProducts}
            printers={activePrinters}
            filaments={activeFilaments}
            templates={templates.data ?? []}
            productSupplies={productSupplies.data ?? []}
            supplies={activeSupplies}
          />
        </CardContent>
      </Card>
      {orders.length ? (
        <div className="grid gap-3">
          {orders.map((order) => {
            const product = productById.get(order.product_id);
            return (
              <Card key={order.id}>
                <CardContent className="grid gap-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{order.order_number}</p>
                        <Badge>{STATUS_LABELS[order.status] ?? order.status}</Badge>
                      </div>
                      <p className="mt-1 text-base font-semibold">{product?.name ?? "Produto nao encontrado"}</p>
                      <p className="text-sm text-muted-foreground">Previsto: {formatCurrency(order.estimated_total_cost)} - {formatMinutes(order.estimated_minutes)} - Criada em {formatDateTime(order.created_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-md border px-2 py-1">Produzidas: {order.produced_quantity}</span>
                        <span className="rounded-md border px-2 py-1">Falhas/perdas: {order.failed_quantity}</span>
                        <span className="rounded-md border px-2 py-1">Custo real: {formatCurrency(order.actual_total_cost ?? 0)}</span>
                      </div>
                      {order.notes ? <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{order.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <ProductionOrderActions order={order} products={activeProducts} printers={activePrinters} />
                    </div>
                  </div>
                  <ProductionOrderLifecycle order={order} supplies={activeSupplies} printedParts={buildPrintedPartGroups(order, product, activeSupplies)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Factory} title="Nenhuma ordem criada" description="Crie uma ordem a partir de um produto para acompanhar producao e estoque." />
      )}
    </PageShell>
  );
}

function buildPrintedPartGroups(order: ProductionOrder, product: Product | undefined, supplies: InventorySupply[]): OrderPartGroup[] {
  if (!product) return [];
  const parts = parseOrderPartNotes(order.notes);
  const groups = new Map<string, OrderPartGroup>();
  for (const part of parts) {
    const key = getPartGroupKey(part.name);
    const supply = findPartSupply(product.name, key, supplies);
    if (!supply) continue;
    const current = groups.get(key);
    if (current) {
      current.name = current.name.includes(part.name) ? current.name : `${current.name} + ${part.name.replace(`${key} - `, "")}`;
      current.plannedQuantity = Math.max(current.plannedQuantity, part.quantity);
      current.totalWeightGrams += part.quantity * part.weightGrams;
      continue;
    }
    groups.set(key, {
      key,
      name: key === part.name ? part.name : `${key} (${part.name.replace(`${key} - `, "")})`,
      supplyId: supply.id,
      supplyLabel: `${supply.name} - estoque ${supply.current_quantity}`,
      plannedQuantity: part.quantity,
      totalWeightGrams: part.quantity * part.weightGrams,
    });
  }
  return Array.from(groups.values());
}

function parseOrderPartNotes(notes: string | null) {
  if (!notes) return [];
  const parts: Array<{ name: string; quantity: number; weightGrams: number }> = [];
  const matcher = /(?:^|Partes:\s*|;\s*)\d+\.\s*([^:]+):\s*([\d,.]+)\s*un\s*x\s*([\d,.]+)\s*g/gi;
  for (const match of notes.matchAll(matcher)) {
    parts.push({
      name: match[1]?.trim() ?? "Parte",
      quantity: parseLocaleNumber(match[2] ?? "0"),
      weightGrams: parseLocaleNumber(match[3] ?? "0"),
    });
  }
  return parts.filter((part) => part.name && part.quantity > 0 && part.weightGrams > 0);
}

function parseLocaleNumber(value: string) {
  return value.includes(",") ? Number(value.replace(/\./g, "").replace(",", ".")) : Number(value);
}

function getPartGroupKey(name: string) {
  return name.match(/^(Parte\s+\d+)/i)?.[1] ?? name;
}

function findPartSupply(productName: string, partKey: string, supplies: InventorySupply[]) {
  const productSearch = normalize(productName);
  const partSearch = normalize(partKey);
  return supplies.find((supply) => {
    const name = normalize(supply.name);
    return name.includes(productSearch) && name.includes(partSearch);
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
