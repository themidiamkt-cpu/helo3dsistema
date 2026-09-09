"use client";

import { Play, CheckCircle2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { finishProductionOrderAction, startProductionOrderAction } from "@/actions/records";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventorySupply, ProductionOrder } from "@/types/database";

const initialState = { ok: false, message: "" };

type PrintedPartOption = {
  key: string;
  name: string;
  supplyId: string;
  supplyLabel: string;
  plannedQuantity: number;
  totalWeightGrams: number;
};

type PrintedPartRow = PrintedPartOption & {
  producedQuantity: number;
  failedQuantity: number;
};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProductionOrderLifecycle({ order, supplies, printedParts = [] }: { order: ProductionOrder; supplies: InventorySupply[]; printedParts?: PrintedPartOption[] }) {
  const [startPending, startTransition] = useTransition();
  const [outputMode, setOutputMode] = useState<"finished_product" | "printed_part">("finished_product");
  const [partRows, setPartRows] = useState<PrintedPartRow[]>(() =>
    printedParts.map((part) => ({ ...part, producedQuantity: part.plannedQuantity, failedQuantity: 0 })),
  );
  const [finishState, finishAction, finishPending] = useActionState(
    async (_: typeof initialState, formData: FormData) => finishProductionOrderAction(formData),
    initialState,
  );
  const isClosed = ["completed", "failed", "cancelled"].includes(order.status);
  const isPrinting = order.status === "printing";
  const totalProducedParts = partRows.reduce((sum, part) => sum + part.producedQuantity, 0);
  const totalFailedParts = partRows.reduce((sum, part) => sum + part.failedQuantity, 0);
  const printedPartsPayload = JSON.stringify(
    partRows.map((part) => ({
      name: part.name,
      supply_id: part.supplyId,
      produced_quantity: part.producedQuantity,
      failed_quantity: part.failedQuantity,
      total_weight_grams: part.totalWeightGrams,
    })),
  );

  function handleStart() {
    startTransition(async () => {
      const result = await startProductionOrderAction(order.id);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
      <ActionToast state={finishState} />
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <p className="font-medium">Produzidas</p>
          <p className="text-xs text-muted-foreground">Entra no estoque acabado.</p>
        </div>
        <div>
          <p className="font-medium">Falhas</p>
          <p className="text-xs text-muted-foreground">Registra perda, sem entrar no estoque.</p>
        </div>
        <div>
          <p className="font-medium">Minutos reais</p>
          <p className="text-xs text-muted-foreground">Atualiza custo e horas da impressora.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={startPending || isPrinting || isClosed} onClick={handleStart}>
          <Play className="size-4" />
          {startPending ? "Iniciando..." : "Iniciar"}
        </Button>
        <form action={finishAction} className="grid flex-1 gap-2">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="printed_parts" value={printedPartsPayload} />
          {outputMode === "printed_part" ? (
            <>
              <input type="hidden" name="produced_quantity" value={totalProducedParts} />
              <input type="hidden" name="failed_quantity" value={totalFailedParts} />
            </>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-[120px_120px_140px_180px_1fr_auto]">
            {outputMode === "finished_product" ? (
              <>
                <div className="grid gap-1">
                  <Label htmlFor={`produced-${order.id}`} className="text-xs">Produzidas</Label>
                  <Input id={`produced-${order.id}`} name="produced_quantity" type="number" min="0" defaultValue={order.planned_quantity} />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`failed-${order.id}`} className="text-xs">Falhas</Label>
                  <Input id={`failed-${order.id}`} name="failed_quantity" type="number" min="0" defaultValue={0} />
                </div>
              </>
            ) : (
              <div className="grid gap-1 sm:col-span-2">
                <Label className="text-xs">Resumo das partes</Label>
                <div className="h-8 rounded-lg border px-2.5 py-1.5 text-sm text-muted-foreground">
                  {totalProducedParts} boas / {totalFailedParts} falhas
                </div>
              </div>
            )}
            <div className="grid gap-1">
              <Label htmlFor={`minutes-${order.id}`} className="text-xs">Minutos reais</Label>
              <Input id={`minutes-${order.id}`} name="actual_minutes" type="number" min="0" defaultValue={order.estimated_minutes} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`mode-${order.id}`} className="text-xs">Destino</Label>
              <select id={`mode-${order.id}`} name="output_mode" value={outputMode} onChange={(event) => setOutputMode(event.target.value as "finished_product" | "printed_part")} className={selectClassName}>
                <option value="finished_product">Produto acabado</option>
                <option value="printed_part">Parte impressa</option>
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`part-${order.id}`} className="text-xs">Parte gerada</Label>
              <select id={`part-${order.id}`} name="output_supply_id" defaultValue="" className={selectClassName} disabled={outputMode === "finished_product" || printedParts.length > 0} required={outputMode === "printed_part" && printedParts.length === 0}>
                <option value="">{outputMode === "finished_product" ? "Nao usado" : printedParts.length ? "Automatico pelas partes" : "Selecione a parte"}</option>
                {supplies.map((supply) => (
                  <option key={supply.id} value={supply.id}>
                    {supply.name} - estoque {supply.current_quantity}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" disabled={finishPending || isClosed} className="self-end">
              <CheckCircle2 className="size-4" />
              {finishPending ? "Finalizando..." : "Finalizar"}
            </Button>
          </div>
          {outputMode === "printed_part" && printedParts.length ? (
            <div className="grid gap-2 rounded-md border bg-background p-2">
              <div className="grid gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-[1fr_1fr_110px_110px]">
                <span>Parte</span>
                <span>Entra no estoque</span>
                <span>Boas</span>
                <span>Falhas</span>
              </div>
              {partRows.map((part) => (
                <div key={part.key} className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_110px] sm:items-center">
                  <div className="text-sm">
                    <p className="font-medium">{part.name}</p>
                    <p className="text-xs text-muted-foreground">{part.totalWeightGrams.toLocaleString("pt-BR")} g previstos</p>
                  </div>
                  <div className="text-sm text-muted-foreground">{part.supplyLabel}</div>
                  <Input
                    type="number"
                    min="0"
                    value={part.producedQuantity}
                    aria-label={`Boas de ${part.name}`}
                    onChange={(event) => setPartRows((current) => current.map((item) => (item.key === part.key ? { ...item, producedQuantity: Number(event.target.value) } : item)))}
                  />
                  <Input
                    type="number"
                    min="0"
                    value={part.failedQuantity}
                    aria-label={`Falhas de ${part.name}`}
                    onChange={(event) => setPartRows((current) => current.map((item) => (item.key === part.key ? { ...item, failedQuantity: Number(event.target.value) } : item)))}
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-1">
            <Label htmlFor={`notes-${order.id}`} className="text-xs">Observacao da finalizacao</Label>
            <Textarea id={`notes-${order.id}`} name="notes" placeholder="Ex.: falhou por descolamento da mesa" rows={2} />
          </div>
        </form>
      </div>
    </div>
  );
}
