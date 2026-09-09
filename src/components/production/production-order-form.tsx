"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createProductionOrderAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProductPartNames, getProductParts } from "@/lib/products/parts";
import type { Filament, InventorySupply, Printer, Product, ProductFilament, ProductSupply } from "@/types/database";

type FilamentLine = {
  id: string;
  partName: string;
  filamentId: string;
  quantity: number;
  weightGrams: number;
  printTimeMinutes: number;
};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProductionOrderForm({
  products,
  printers,
  filaments,
  templates,
  productSupplies = [],
  supplies = [],
}: {
  products: Product[];
  printers: Printer[];
  filaments: Filament[];
  templates: ProductFilament[];
  productSupplies?: ProductSupply[];
  supplies?: InventorySupply[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const [lines, setLines] = useState<FilamentLine[]>(() => buildLines(products[0]?.id ?? "", products, templates, filaments, productSupplies, supplies));
  const selectedProduct = products.find((product) => product.id === productId);

  const payload = useMemo(
    () =>
      JSON.stringify(
        lines
          .filter((line) => line.filamentId && line.weightGrams > 0)
          .map((line) => ({
            part_name: line.partName,
            filament_id: line.filamentId,
            quantity: line.quantity,
            weight_grams: line.weightGrams,
            print_time_minutes: line.printTimeMinutes,
          })),
      ),
    [lines],
  );

  function handleProductChange(nextProductId: string | null) {
    if (!nextProductId) return;
    setProductId(nextProductId);
    const nextProduct = products.find((product) => product.id === nextProductId);
    setPrinterId(nextProduct?.printer_id ?? printers[0]?.id ?? "");
    setLines(buildLines(nextProductId, products, templates, filaments, productSupplies, supplies));
  }

  return (
    <form action={createProductionOrderAction as (formData: FormData) => void} className="grid gap-4">
      <input type="hidden" name="filaments" value={payload} />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_160px]">
        <div className="grid gap-2">
          <Label>Produto</Label>
          <select name="product_id" value={productId} onChange={(event) => handleProductChange(event.target.value)} className={selectClassName} required>
            <option value="">Selecione</option>
            {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Impressora</Label>
          <select name="printer_id" value={printerId} onChange={(event) => setPrinterId(event.target.value)} className={selectClassName}>
            <option value="">Impressora</option>
            {printers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.model ? ` - ${item.model}` : ""}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>Quantidade</Label>
          <Input name="planned_quantity" type="number" defaultValue={1} min={1} />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <Label>Filamentos da producao</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, createLine(filaments[0]?.id ?? "", 0, current.length)])}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
        {lines.map((line, index) => (
          <div key={line.id} className="grid gap-2 sm:grid-cols-[220px_1fr_110px_140px_140px_40px] sm:items-end">
            <div className="grid gap-1">
              <Label htmlFor={`part-name-${line.id}`} className="text-xs">Nome da parte {index + 1}</Label>
              <Input
                id={`part-name-${line.id}`}
                value={line.partName}
                placeholder="Ex.: base, tampa, dino amarelo"
                onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, partName: event.target.value } : item)))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`filament-${line.id}`} className="text-xs">Rolo usado</Label>
              <select id={`filament-${line.id}`} value={line.filamentId} onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, filamentId: event.target.value } : item)))} className={selectClassName}>
                <option value="">Selecione o rolo</option>
                {filaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`quantity-${line.id}`} className="text-xs">Qtd.</Label>
              <Input
                id={`quantity-${line.id}`}
                type="number"
                step="1"
                min={1}
                value={line.quantity}
                aria-label={`Quantidade da parte ${index + 1}`}
                onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item)))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`weight-${line.id}`} className="text-xs">Gramas</Label>
              <Input
                id={`weight-${line.id}`}
                type="number"
                step="0.01"
                min={0}
                value={line.weightGrams}
                aria-label={`Peso da parte ${index + 1}`}
                onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, weightGrams: Number(event.target.value) } : item)))}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`time-${line.id}`} className="text-xs">Tempo (min)</Label>
              <Input
                id={`time-${line.id}`}
                type="number"
                step="1"
                min={0}
                value={line.printTimeMinutes}
                aria-label={`Tempo da parte ${index + 1}`}
                onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, printTimeMinutes: Number(event.target.value) } : item)))}
              />
            </div>
            <Button type="button" size="icon" variant="ghost" aria-label="Remover filamento" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div>
        <Button type="submit" disabled={!selectedProduct || !lines.some((line) => line.filamentId && line.weightGrams > 0)}>
          Criar ordem
        </Button>
      </div>
    </form>
  );
}

function createLine(filamentId: string, weightGrams: number, index = 0, partName?: string, printTimeMinutes = 0): FilamentLine {
  return { id: crypto.randomUUID(), partName: partName || `Parte ${index + 1}`, filamentId, quantity: 1, weightGrams, printTimeMinutes };
}

function buildLines(productId: string, products: Product[], templates: ProductFilament[], filaments: Filament[], productSupplies: ProductSupply[], supplies: InventorySupply[]) {
  const firstFilamentId = filaments[0]?.id ?? "";
  const weights = templates.filter((template) => template.product_id === productId).map((template) => template.weight_grams);
  if (!weights.length) return [createLine(firstFilamentId, 0)];
  const productParts = getProductParts(products.find((product) => product.id === productId) ?? { description: null });
  const productPartNames = getProductPartNames(products.find((product) => product.id === productId) ?? { description: null });
  const linkedSupplyNames = productSupplies
    .filter((item) => item.product_id === productId)
    .map((item) => supplies.find((supply) => supply.id === item.supply_id)?.name)
    .filter(Boolean) as string[];
  return weights.map((weight, index) => createLine(
    firstFilamentId,
    productParts[index]?.weightGrams || weight,
    index,
    productParts[index]?.name ?? productPartNames[index] ?? linkedSupplyNames[index],
    productParts[index]?.printTimeMinutes ?? 0,
  ));
}
