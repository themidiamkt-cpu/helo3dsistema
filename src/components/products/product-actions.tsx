"use client";

import { Copy, Pencil, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProductAction, duplicateProductAction, updateProductAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getProductParts, getProductPublicDescription } from "@/lib/products/parts";
import type { Filament, InventorySupply, Printer, Product, ProductFilament, ProductSupply } from "@/types/database";
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type SupplyLine = {
  id: string;
  supplyId: string;
  quantity: number;
};

type PartLine = {
  id: string;
  name: string;
  filamentId: string;
  weightGrams: number;
  printTimeMinutes: number;
};

function createSupplyLine(supplyId: string, quantity = 1): SupplyLine {
  return { id: crypto.randomUUID(), supplyId, quantity };
}

function createPartLine(index: number, filamentId: string, name?: string, weightGrams = 0, printTimeMinutes = 0): PartLine {
  return { id: crypto.randomUUID(), name: name || `Parte ${index + 1}`, filamentId, weightGrams, printTimeMinutes };
}

export function ProductActions({
  product,
  printers,
  filaments,
  productFilaments,
  supplies,
  productSupplies,
}: {
  product: Product;
  printers: Printer[];
  filaments: Filament[];
  productFilaments: ProductFilament[];
  supplies: InventorySupply[];
  productSupplies: ProductSupply[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [partLines, setPartLines] = useState<PartLine[]>(() => {
    const parts = getProductParts(product);
    const linkedFilaments = productFilaments.filter((item) => item.product_id === product.id);
    const total = Math.max(parts.length, linkedFilaments.length, 1);
    return Array.from({ length: total }, (_, index) => {
      const part = parts[index];
      const filamentLine = linkedFilaments[index];
      return createPartLine(
        index,
        filamentLine?.filament_id ?? filaments[0]?.id ?? "",
        part?.name,
        part?.weightGrams || filamentLine?.weight_grams || 0,
        part?.printTimeMinutes || 0,
      );
    });
  });
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>(() => {
    const linked = productSupplies.filter((item) => item.product_id === product.id);
    return linked.map((item) => createSupplyLine(item.supply_id, item.quantity));
  });
  const suppliesPayload = useMemo(
    () =>
      JSON.stringify(
        supplyLines
          .map((line) => {
            const supply = supplies.find((item) => item.id === line.supplyId);
            return {
              supply_id: line.supplyId,
              quantity: line.quantity,
              unit_cost: supply?.unit_cost ?? 0,
            };
          })
          .filter((line) => line.supply_id && line.quantity > 0),
      ),
    [supplies, supplyLines],
  );
  const partDetailsPayload = useMemo(
    () =>
      JSON.stringify(
        partLines
          .map((line) => ({ name: line.name, weightGrams: line.weightGrams, printTimeMinutes: line.printTimeMinutes }))
          .filter((line) => line.name.trim()),
      ),
    [partLines],
  );
  const filamentsPayload = useMemo(
    () =>
      JSON.stringify(
        partLines
          .map((line) => ({ filament_id: line.filamentId, weight_grams: line.weightGrams }))
          .filter((line) => line.filament_id && line.weight_grams > 0),
      ),
    [partLines],
  );

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleEdit(formData: FormData) {
    runAction(async () => {
      const result = await updateProductAction(formData);
      if (result.ok) setOpen(false);
      return result;
    });
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil className="size-4" /> Editar</Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runAction(() => duplicateProductAction(product.id))}><Copy className="size-4" /> Duplicar</Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => window.confirm(`Excluir ${product.name}?`) && runAction(() => deleteProductAction(product.id))}><Trash2 className="size-4" /> Excluir</Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-semibold">Editar produto</h2><p className="text-sm text-muted-foreground">Atualize dados comerciais e parametros de custo.</p></div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-4" /></Button>
            </div>
            <form action={handleEdit} className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="part_details" value={partDetailsPayload} />
              <input type="hidden" name="filaments" value={filamentsPayload} />
              <input type="hidden" name="supplies" value={suppliesPayload} />
              <div className="grid gap-2"><Label>Nome</Label><Input name="name" defaultValue={product.name} required /></div>
              <div className="grid gap-2"><Label>SKU</Label><Input name="sku" defaultValue={product.sku ?? ""} /></div>
              <div className="grid gap-2"><Label>Categoria</Label><Input name="category" defaultValue={product.category ?? ""} /></div>
              <div className="grid gap-2">
                <Label>Impressora</Label>
                <select name="printer_id" defaultValue={product.printer_id ?? ""} className={selectClassName}>
                  <option value="">Impressora</option>
                    {printers.map((printer) => (
                      <option key={printer.id} value={printer.id}>
                        {printer.name}{printer.model ? ` - ${printer.model}` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid gap-2"><Label>Tempo total (min)</Label><Input name="print_time_minutes" type="number" defaultValue={product.print_time_minutes} required /></div>
              <div className="grid gap-2"><Label>Quantidade por lote</Label><Input name="batch_quantity" type="number" defaultValue={product.batch_quantity} required /></div>
              <div className="grid gap-2"><Label>Embalagem</Label><Input name="packaging_cost" type="number" step="0.01" defaultValue={product.packaging_cost} required /></div>
              <div className="grid gap-2"><Label>Mao de obra fixa</Label><Input name="fixed_labor_cost" type="number" step="0.01" defaultValue={product.fixed_labor_cost} required /></div>
              <div className="grid gap-2"><Label>Tempo mao de obra (min)</Label><Input name="labor_time_minutes" type="number" defaultValue={product.labor_time_minutes} required /></div>
              <div className="grid gap-2"><Label>Preco manual</Label><Input name="manual_sale_price" type="number" step="0.01" defaultValue={product.manual_sale_price ?? ""} /></div>
              <div className="grid gap-2"><Label>Estoque acabado</Label><Input name="finished_stock_quantity" type="number" defaultValue={product.finished_stock_quantity} required /></div>
              <div className="grid gap-2"><Label>Estoque minimo</Label><Input name="minimum_finished_stock" type="number" defaultValue={product.minimum_finished_stock} required /></div>
              <div className="grid gap-2 sm:col-span-3"><Label>Descricao</Label><Textarea name="description" defaultValue={getProductPublicDescription(product)} /></div>
              <div className="grid gap-3 rounded-md border p-3 sm:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Partes do produto</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPartLines((current) => [...current, createPartLine(current.length, filaments[0]?.id ?? "")])}>Adicionar parte</Button>
                </div>
                {partLines.map((line, index) => (
                  <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_130px_40px] sm:items-end">
                    <div className="grid gap-1">
                      <Label className="text-xs">Nome da parte {index + 1}</Label>
                      <Input value={line.name} onChange={(event) => setPartLines((current) => current.map((item) => (item.id === line.id ? { ...item, name: event.target.value } : item)))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Rolo base</Label>
                      <select value={line.filamentId} onChange={(event) => setPartLines((current) => current.map((item) => (item.id === line.id ? { ...item, filamentId: event.target.value } : item)))} className={selectClassName}>
                        <option value="">Selecione</option>
                        {filaments.map((filament) => <option key={filament.id} value={filament.id}>{filament.name}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Peso (g)</Label>
                      <Input type="number" step="0.01" min={0} value={line.weightGrams} onChange={(event) => setPartLines((current) => current.map((item) => (item.id === line.id ? { ...item, weightGrams: Number(event.target.value) } : item)))} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Tempo (min)</Label>
                      <Input type="number" step="1" min={0} value={line.printTimeMinutes} onChange={(event) => setPartLines((current) => current.map((item) => (item.id === line.id ? { ...item, printTimeMinutes: Number(event.target.value) } : item)))} />
                    </div>
                    <Button type="button" size="icon" variant="ghost" aria-label="Remover parte" onClick={() => setPartLines((current) => current.filter((item) => item.id !== line.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 rounded-md border p-3 sm:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Componentes da montagem</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setSupplyLines((current) => [...current, createSupplyLine(supplies[0]?.id ?? "")])}>
                    <Plus className="size-4" />
                    Adicionar componente
                  </Button>
                </div>
                {supplyLines.length ? (
                  supplyLines.map((line, index) => (
                    <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_160px_40px] sm:items-end">
                      <div className="grid gap-1">
                        <Label htmlFor={`edit-product-supply-${line.id}`} className="text-xs">Componente {index + 1}</Label>
                        <select id={`edit-product-supply-${line.id}`} value={line.supplyId} onChange={(event) => setSupplyLines((current) => current.map((item) => (item.id === line.id ? { ...item, supplyId: event.target.value } : item)))} className={selectClassName}>
                          <option value="">Selecione</option>
                          {supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} - estoque {supply.current_quantity}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <Label htmlFor={`edit-product-supply-qty-${line.id}`} className="text-xs">Qtd. por produto</Label>
                        <Input id={`edit-product-supply-qty-${line.id}`} type="number" step="0.01" min={0} value={line.quantity} onChange={(event) => setSupplyLines((current) => current.map((item) => (item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item)))} />
                      </div>
                      <Button type="button" size="icon" variant="ghost" aria-label="Remover componente" onClick={() => setSupplyLines((current) => current.filter((item) => item.id !== line.id))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Adicione aqui clicker, imas, parafusos ou partes consumidas na montagem.</p>
                )}
              </div>
              <div className="flex justify-end gap-2 sm:col-span-3"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar alteracoes"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
