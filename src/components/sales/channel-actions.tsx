"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteSalesChannelAction, updateSalesChannelAction } from "@/actions/records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChannelActions({
  id,
  name,
  feePercentage,
  fixedFee,
}: {
  id: string;
  name: string;
  feePercentage: number;
  fixedFee: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleEdit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSalesChannelAction(formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Remover canal ${name}?`)) return;
    startTransition(async () => {
      const result = await deleteSalesChannelAction(id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)} aria-label="Editar canal">
        <Pencil className="size-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={handleDelete} aria-label="Remover canal">
        <Trash2 className="size-4 text-destructive" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-4 shadow-lg ring-1 ring-border">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Editar canal</h2>
                <p className="text-sm text-muted-foreground">Ajuste taxa percentual e fixa usadas nas proximas vendas.</p>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar">
                <X className="size-4" />
              </Button>
            </div>
            <form action={handleEdit} className="grid gap-3 text-left">
              <input type="hidden" name="id" value={id} />
              <div className="grid gap-1">
                <Label htmlFor={`channel-name-${id}`}>Canal</Label>
                <Input id={`channel-name-${id}`} name="name" defaultValue={name} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor={`channel-fee-${id}`}>Taxa %</Label>
                  <Input id={`channel-fee-${id}`} name="fee_percentage" type="number" step="0.01" min="0" max="100" defaultValue={feePercentage} required />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`channel-fixed-${id}`}>Taxa fixa</Label>
                  <Input id={`channel-fixed-${id}`} name="fixed_fee" type="number" step="0.01" min="0" defaultValue={fixedFee} required />
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
