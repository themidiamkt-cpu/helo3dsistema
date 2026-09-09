"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { assembleProductAction } from "@/actions/records";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventorySupply, Product, ProductSupply } from "@/types/database";

type SupplyLine = {
  id: string;
  supplyId: string;
  quantity: number;
};

const initialState = { ok: false, message: "" };
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function createLine(supplyId: string, quantity = 1): SupplyLine {
  return { id: crypto.randomUUID(), supplyId, quantity };
}

function buildLines(productId: string, productSupplies: ProductSupply[], supplies: InventorySupply[]) {
  const linked = productSupplies.filter((item) => item.product_id === productId);
  if (linked.length) return linked.map((item) => createLine(item.supply_id, item.quantity));
  return [createLine(supplies[0]?.id ?? "", 1)];
}

export function AssemblyForm({
  products,
  supplies,
  productSupplies,
}: {
  products: Product[];
  supplies: InventorySupply[];
  productSupplies: ProductSupply[];
}) {
  const [state, formAction, pending] = useActionState(async (_: typeof initialState, formData: FormData) => assembleProductAction(formData), initialState);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [lines, setLines] = useState<SupplyLine[]>(() => buildLines(products[0]?.id ?? "", productSupplies, supplies));
  const [quantity, setQuantity] = useState(1);
  const payload = useMemo(
    () =>
      JSON.stringify(
        lines
          .filter((line) => line.supplyId && line.quantity > 0)
          .map((line) => ({ supply_id: line.supplyId, quantity: line.quantity })),
      ),
    [lines],
  );

  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);
    setLines(buildLines(nextProductId, productSupplies, supplies));
  }

  return (
    <form action={formAction} className="grid gap-4">
      <ActionToast state={state} />
      <input type="hidden" name="supplies" value={payload} />
      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        <div className="grid gap-2">
          <Label>Produto acabado</Label>
          <select name="product_id" value={productId} onChange={(event) => handleProductChange(event.target.value)} className={selectClassName} required>
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Quantidade a montar</Label>
          <Input name="quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
        </div>
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Partes e componentes consumidos por unidade</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, createLine(supplies[0]?.id ?? "", 1)])}>
            <Plus className="size-4" />
            Adicionar
          </Button>
        </div>
        {lines.map((line, index) => {
          const supply = supplies.find((item) => item.id === line.supplyId);
          return (
            <div key={line.id} className="grid gap-2 sm:grid-cols-[80px_1fr_160px_40px] sm:items-end">
              <p className="text-sm font-medium">Item {index + 1}</p>
              <div className="grid gap-1">
                <Label htmlFor={`assembly-supply-${line.id}`} className="text-xs">Parte/componente</Label>
                <select id={`assembly-supply-${line.id}`} value={line.supplyId} onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, supplyId: event.target.value } : item)))} className={selectClassName}>
                  <option value="">Selecione</option>
                  {supplies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - estoque {item.current_quantity}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`assembly-qty-${line.id}`} className="text-xs">Qtd. por produto</Label>
                <Input
                  id={`assembly-qty-${line.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item)))}
                />
                <p className="text-xs text-muted-foreground">Vai consumir {(line.quantity * quantity || 0).toLocaleString("pt-BR")} de {supply?.unit ?? "un."}</p>
              </div>
              <Button type="button" size="icon" variant="ghost" aria-label="Remover item" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <div className="grid gap-2">
        <Label>Observacao</Label>
        <Textarea name="notes" placeholder="Ex.: montagem com parte 1 + parte 2 + clicker" />
      </div>
      <div>
        <Button type="submit" disabled={pending || !lines.some((line) => line.supplyId && line.quantity > 0)}>
          {pending ? "Montando..." : "Registrar montagem"}
        </Button>
      </div>
    </form>
  );
}
