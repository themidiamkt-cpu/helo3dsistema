"use client";

import { Copy, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSupplyAction, duplicateSupplyAction, updateSupplyAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUPPLY_CATEGORIES, SUPPLY_UNITS } from "@/lib/constants";
import type { InventorySupply } from "@/types/database";

export function SupplyActions({ supply }: { supply: InventorySupply }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleEdit(formData: FormData) {
    runAction(async () => {
      const result = await updateSupplyAction(formData);
      if (result.ok) setOpen(false);
      return result;
    });
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil className="size-4" /> Editar</Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runAction(() => duplicateSupplyAction(supply.id))}><Copy className="size-4" /> Duplicar</Button>
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => window.confirm(`Excluir ${supply.name}?`) && runAction(() => deleteSupplyAction(supply.id))}><Trash2 className="size-4" /> Excluir</Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-semibold">Editar item</h2><p className="text-sm text-muted-foreground">Atualize custo, saldo e fornecedor.</p></div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-4" /></Button>
            </div>
            <form action={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={supply.id} />
              <div className="grid gap-2"><Label>Nome</Label><Input name="name" defaultValue={supply.name} required /></div>
              <div className="grid gap-2"><Label>SKU</Label><Input name="sku" defaultValue={supply.sku ?? ""} /></div>
              <div className="grid gap-2"><Label>Categoria</Label><Select name="category" defaultValue={supply.category}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{SUPPLY_CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Unidade</Label><Select name="unit" defaultValue={supply.unit}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{SUPPLY_UNITS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-2"><Label>Quantidade atual</Label><Input name="current_quantity" type="number" step="0.001" defaultValue={supply.current_quantity} required /></div>
              <div className="grid gap-2"><Label>Estoque minimo</Label><Input name="minimum_quantity" type="number" step="0.001" defaultValue={supply.minimum_quantity} required /></div>
              <div className="grid gap-2"><Label>Quantidade comprada</Label><Input name="purchase_quantity" type="number" step="0.001" defaultValue={supply.purchase_quantity} required /></div>
              <div className="grid gap-2"><Label>Preco de compra</Label><Input name="purchase_price" type="number" step="0.01" defaultValue={supply.purchase_price} required /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Fornecedor</Label><Input name="supplier" defaultValue={supply.supplier ?? ""} /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Observacoes</Label><Textarea name="notes" defaultValue={supply.notes ?? ""} /></div>
              <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar alteracoes"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

