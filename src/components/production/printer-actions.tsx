"use client";

import { Copy, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePrinterAction, duplicatePrinterAction, updatePrinterAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRINTER_STATUSES } from "@/lib/constants";
import type { Printer } from "@/types/database";

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function PrinterActions({ printer }: { printer: Printer }) {
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
      const result = await updatePrinterAction(formData);
      if (result.ok) setOpen(false);
      return result;
    });
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="size-4" />
          Editar
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runAction(() => duplicatePrinterAction(printer.id))}>
          <Copy className="size-4" />
          Duplicar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Excluir ${printer.name}?`)) runAction(() => deletePrinterAction(printer.id));
          }}
        >
          <Trash2 className="size-4" />
          Excluir
        </Button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Editar impressora</h2>
                <p className="text-sm text-muted-foreground">Atualize status, custo-hora e manutencao.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="size-4" />
              </Button>
            </div>

            <form action={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={printer.id} />
              <div className="grid gap-2">
                <Label htmlFor={`printer-name-${printer.id}`}>Nome</Label>
                <Input id={`printer-name-${printer.id}`} name="name" defaultValue={printer.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-model-${printer.id}`}>Modelo</Label>
                <Input id={`printer-model-${printer.id}`} name="model" defaultValue={printer.model ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-power-${printer.id}`}>Consumo medio (W)</Label>
                <Input id={`printer-power-${printer.id}`} name="power_watts" type="number" step="0.01" defaultValue={printer.power_watts} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-cost-${printer.id}`}>Custo por hora</Label>
                <Input id={`printer-cost-${printer.id}`} name="machine_cost_per_hour" type="number" step="0.01" defaultValue={printer.machine_cost_per_hour} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-price-${printer.id}`}>Preco de compra</Label>
                <Input id={`printer-price-${printer.id}`} name="purchase_price" type="number" step="0.01" defaultValue={printer.purchase_price ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-date-${printer.id}`}>Data de compra</Label>
                <Input id={`printer-date-${printer.id}`} name="purchase_date" type="date" defaultValue={dateValue(printer.purchase_date)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-status-${printer.id}`}>Status</Label>
                <Select name="status" defaultValue={printer.status}>
                  <SelectTrigger id={`printer-status-${printer.id}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRINTER_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-hours-${printer.id}`}>Horas impressas</Label>
                <Input id={`printer-hours-${printer.id}`} name="total_printed_hours" type="number" step="0.01" defaultValue={printer.total_printed_hours} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-maintenance-${printer.id}`}>Intervalo de manutencao (h)</Label>
                <Input id={`printer-maintenance-${printer.id}`} name="maintenance_interval_hours" type="number" step="0.01" defaultValue={printer.maintenance_interval_hours ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`printer-next-${printer.id}`}>Proxima manutencao (h)</Label>
                <Input id={`printer-next-${printer.id}`} name="next_maintenance_at_hours" type="number" step="0.01" defaultValue={printer.next_maintenance_at_hours ?? ""} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`printer-notes-${printer.id}`}>Observacoes</Label>
                <Textarea id={`printer-notes-${printer.id}`} name="notes" defaultValue={printer.notes ?? ""} />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Salvando..." : "Salvar alteracoes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
