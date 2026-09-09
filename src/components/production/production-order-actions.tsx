"use client";

import { Ban, Copy, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteProductionOrderAction, duplicateProductionOrderAction, updateProductionOrderAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCTION_STATUSES } from "@/lib/constants";
import type { Printer, Product, ProductionOrder } from "@/types/database";

function dateTimeValue(value: string | null) {
  return value ? value.slice(0, 16) : "";
}
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProductionOrderActions({ order, products, printers }: { order: ProductionOrder; products: Product[]; printers: Printer[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const locked = ["completed", "cancelled"].includes(order.status);
  const cancelLabel = order.status === "cancelled" ? "Estornar estoque" : "Cancelar";
  const cancelConfirmation =
    order.status === "cancelled"
      ? `Estornar o estoque movimentado pela ${order.order_number}?`
      : `Cancelar ${order.order_number} e estornar o estoque movimentado?`;

  function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function handleEdit(formData: FormData) {
    runAction(async () => {
      const result = await updateProductionOrderAction(formData);
      if (result.ok) setOpen(false);
      return result;
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => setOpen(true)}><Pencil className="size-4" /> Editar</Button>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runAction(() => duplicateProductionOrderAction(order.id))}><Copy className="size-4" /> Duplicar</Button>
      <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => window.confirm(cancelConfirmation) && runAction(() => deleteProductionOrderAction(order.id))}><Ban className="size-4" /> {cancelLabel}</Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Editar ordem</h2><p className="text-sm text-muted-foreground">Ajuste produto, impressora, quantidade e status.</p></div><Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)}><X className="size-4" /></Button></div>
            <form action={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={order.id} />
              <div className="grid gap-2"><Label>Produto</Label><select name="product_id" defaultValue={order.product_id} className={selectClassName}>{products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="grid gap-2"><Label>Impressora</Label><select name="printer_id" defaultValue={order.printer_id ?? ""} className={selectClassName}><option value="">Opcional</option>{printers.map((item) => <option key={item.id} value={item.id}>{item.name}{item.model ? ` - ${item.model}` : ""}</option>)}</select></div>
              <div className="grid gap-2"><Label>Quantidade planejada</Label><Input name="planned_quantity" type="number" defaultValue={order.planned_quantity} required /></div>
              <div className="grid gap-2"><Label>Status</Label><select name="status" defaultValue={order.status} className={selectClassName}>{PRODUCTION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Inicio planejado</Label><Input name="planned_start_at" type="datetime-local" defaultValue={dateTimeValue(order.planned_start_at)} /></div>
              <div className="grid gap-2 sm:col-span-2"><Label>Observacoes</Label><Textarea name="notes" defaultValue={order.notes ?? ""} /></div>
              <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar alteracoes"}</Button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
