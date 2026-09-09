"use client";

import { Copy, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteFilamentAction, duplicateFilamentAction, updateFilamentAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MATERIALS } from "@/lib/constants";
import type { Filament } from "@/types/database";

function dateValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function FilamentActions({ filament }: { filament: Filament }) {
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
      const result = await updateFilamentAction(formData);
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
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => runAction(() => duplicateFilamentAction(filament.id))}>
          <Copy className="size-4" />
          Duplicar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Excluir ${filament.name}?`)) {
              runAction(() => deleteFilamentAction(filament.id));
            }
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
                <h2 className="font-semibold">Editar filamento</h2>
                <p className="text-sm text-muted-foreground">Atualize custo, saldo e dados de compra.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="size-4" />
              </Button>
            </div>
            <form action={handleEdit} className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={filament.id} />
              <div className="grid gap-2">
                <Label htmlFor={`name-${filament.id}`}>Nome</Label>
                <Input id={`name-${filament.id}`} name="name" defaultValue={filament.name} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`brand-${filament.id}`}>Marca</Label>
                <Input id={`brand-${filament.id}`} name="brand" defaultValue={filament.brand ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`material-${filament.id}`}>Material</Label>
                <Select name="material" defaultValue={filament.material}>
                  <SelectTrigger id={`material-${filament.id}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((material) => (
                      <SelectItem key={material} value={material}>
                        {material}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`color-name-${filament.id}`}>Cor</Label>
                <Input id={`color-name-${filament.id}`} name="color_name" defaultValue={filament.color_name ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`color-hex-${filament.id}`}>Hex da cor</Label>
                <Input id={`color-hex-${filament.id}`} name="color_hex" defaultValue={filament.color_hex ?? ""} placeholder="#ffffff" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`supplier-${filament.id}`}>Fornecedor</Label>
                <Input id={`supplier-${filament.id}`} name="supplier" defaultValue={filament.supplier ?? ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`initial-${filament.id}`}>Peso inicial (g)</Label>
                <Input id={`initial-${filament.id}`} name="initial_weight_grams" type="number" step="0.001" defaultValue={filament.initial_weight_grams} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`current-${filament.id}`}>Peso atual (g)</Label>
                <Input id={`current-${filament.id}`} name="current_weight_grams" type="number" step="0.001" defaultValue={filament.current_weight_grams} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`spool-${filament.id}`}>Peso do carretel (g)</Label>
                <Input id={`spool-${filament.id}`} name="spool_weight_grams" type="number" step="0.001" defaultValue={filament.spool_weight_grams} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`price-${filament.id}`}>Preco de compra</Label>
                <Input id={`price-${filament.id}`} name="purchase_price" type="number" step="0.01" defaultValue={filament.purchase_price} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`minimum-${filament.id}`}>Estoque minimo (g)</Label>
                <Input id={`minimum-${filament.id}`} name="minimum_stock_grams" type="number" step="0.001" defaultValue={filament.minimum_stock_grams} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`date-${filament.id}`}>Data de compra</Label>
                <Input id={`date-${filament.id}`} name="purchase_date" type="date" defaultValue={dateValue(filament.purchase_date)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`lot-${filament.id}`}>Lote</Label>
                <Input id={`lot-${filament.id}`} name="lot_number" defaultValue={filament.lot_number ?? ""} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor={`notes-${filament.id}`}>Observacoes</Label>
                <Textarea id={`notes-${filament.id}`} name="notes" defaultValue={filament.notes ?? ""} />
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
