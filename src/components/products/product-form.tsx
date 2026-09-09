"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { createProductAction } from "@/actions/records";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculatePricing } from "@/lib/calculations/pricing";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import type { Database, Filament, InventorySupply, Printer } from "@/types/database";

type PartLine = {
  id: string;
  name: string;
  filamentId: string;
  weightGrams: number;
  printTimeMinutes: number;
};

type SupplyLine = {
  id: string;
  supplyId: string;
  quantity: number;
};

type Settings = Database["public"]["Tables"]["organization_settings"]["Row"] | null;

const initialState = { ok: false, message: "" };
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function createLine(index: number, filamentId: string): PartLine {
  return { id: crypto.randomUUID(), name: `Parte ${index + 1}`, filamentId, weightGrams: 0, printTimeMinutes: 0 };
}

function createSupplyLine(supplyId: string): SupplyLine {
  return { id: crypto.randomUUID(), supplyId, quantity: 1 };
}

function safeNumber(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function ProductForm({ printers, filaments, supplies, settings }: { printers: Printer[]; filaments: Filament[]; supplies: InventorySupply[]; settings: Settings }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<PartLine[]>([createLine(0, filaments[0]?.id ?? "")]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const [printTimeMinutes, setPrintTimeMinutes] = useState(60);
  const [batchQuantity, setBatchQuantity] = useState(1);
  const [packagingCost, setPackagingCost] = useState(0);
  const [fixedLaborCost, setFixedLaborCost] = useState(0);
  const [laborTimeMinutes, setLaborTimeMinutes] = useState(0);
  const [state, formAction, pending] = useActionState(async (_: typeof initialState, formData: FormData) => {
    const result = await createProductAction(formData);
    if (result.ok) setOpen(false);
    return result;
  }, initialState);
  const selectedPrinter = printers.find((printer) => printer.id === printerId);

  const payloads = useMemo(() => {
    const partNames = lines.map((line) => line.name).filter(Boolean);
    const partDetails = lines
      .map((line) => ({
        name: line.name,
        weightGrams: line.weightGrams,
        printTimeMinutes: line.printTimeMinutes,
      }))
      .filter((line) => line.name.trim());
    const filamentPayload = lines
      .map((line) => {
        const filament = filaments.find((item) => item.id === line.filamentId);
        return {
          filament_id: line.filamentId,
          weight_grams: line.weightGrams,
          cost_per_gram: filament?.cost_per_gram ?? 0,
        };
      })
      .filter((line) => line.filament_id && line.weight_grams > 0);
    return {
      partNames: JSON.stringify(partNames),
      partDetails: JSON.stringify(partDetails),
      filaments: JSON.stringify(filamentPayload),
      supplies: JSON.stringify(
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
    };
  }, [filaments, lines, supplies, supplyLines]);
  const pricing = useMemo(() => calculatePricing({
    filaments: lines.map((line) => {
      const filament = filaments.find((item) => item.id === line.filamentId);
      return { weightGrams: safeNumber(line.weightGrams), costPerGram: filament?.cost_per_gram ?? 0 };
    }),
    supplies: supplyLines.map((line) => {
      const supply = supplies.find((item) => item.id === line.supplyId);
      return { quantity: safeNumber(line.quantity), unitCost: supply?.unit_cost ?? 0 };
    }),
    printTimeMinutes: safeNumber(printTimeMinutes),
    batchQuantity: Math.max(1, Math.round(safeNumber(batchQuantity))),
    packagingCost: safeNumber(packagingCost),
    fixedLaborCost: safeNumber(fixedLaborCost),
    laborTimeMinutes: safeNumber(laborTimeMinutes),
    laborCostPerHour: settings?.default_labor_cost_per_hour ?? DEFAULT_SETTINGS.laborCostPerHour,
    machineCostPerHour: selectedPrinter?.machine_cost_per_hour ?? DEFAULT_SETTINGS.machineCostPerHour,
    energyCostPerKwh: settings?.energy_cost_per_kwh ?? DEFAULT_SETTINGS.energyCostPerKwh,
    printerPowerWatts: selectedPrinter?.power_watts ?? DEFAULT_SETTINGS.printerPowerWatts,
    wastePercentage: settings?.default_waste_percentage ?? DEFAULT_SETTINGS.wastePercentage,
    markup: settings?.default_markup ?? DEFAULT_SETTINGS.markup,
  }), [batchQuantity, filaments, fixedLaborCost, laborTimeMinutes, lines, packagingCost, printTimeMinutes, selectedPrinter, settings, supplies, supplyLines]);
  const validFilamentLines = lines
    .map((line) => {
      const filament = filaments.find((item) => item.id === line.filamentId);
      const weight = safeNumber(line.weightGrams);
      return { id: line.id, name: filament?.name ?? "Filamento", weight, cost: weight * (filament?.cost_per_gram ?? 0) };
    })
    .filter((line) => line.weight > 0);
  const validSupplyLines = supplyLines
    .map((line) => {
      const supply = supplies.find((item) => item.id === line.supplyId);
      const quantity = safeNumber(line.quantity);
      return { id: line.id, name: supply?.name ?? "Componente", quantity, cost: quantity * (supply?.unit_cost ?? 0) };
    })
    .filter((line) => line.quantity > 0);

  return (
    <div>
      <ActionToast state={state} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>
          <Plus className="size-4" />
          Novo produto
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="part_names" value={payloads.partNames} />
            <input type="hidden" name="part_details" value={payloads.partDetails} />
            <input type="hidden" name="filaments" value={payloads.filaments} />
            <input type="hidden" name="supplies" value={payloads.supplies} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2"><Label>Nome</Label><Input name="name" placeholder="Brinquedo clicker" required /></div>
              <div className="grid gap-2"><Label>SKU</Label><Input name="sku" /></div>
              <div className="grid gap-2"><Label>Categoria</Label><Input name="category" /></div>
              <div className="grid gap-2">
                <Label>Impressora</Label>
                <select name="printer_id" className={selectClassName} value={printerId} onChange={(event) => setPrinterId(event.target.value)} required>
                  <option value="">Selecione</option>
                  {printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.name}{printer.model ? ` - ${printer.model}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2"><Label>Tempo total (min)</Label><Input name="print_time_minutes" type="number" value={printTimeMinutes} min={1} onChange={(event) => setPrintTimeMinutes(Number(event.target.value))} required /></div>
              <div className="grid gap-2"><Label>Quantidade por lote</Label><Input name="batch_quantity" type="number" value={batchQuantity} min={1} onChange={(event) => setBatchQuantity(Math.max(1, Number(event.target.value)))} required /></div>
              <div className="grid gap-2"><Label>Custo de embalagem</Label><Input name="packaging_cost" type="number" step="0.01" value={packagingCost} onChange={(event) => setPackagingCost(Number(event.target.value))} /></div>
              <div className="grid gap-2"><Label>Mao de obra fixa</Label><Input name="fixed_labor_cost" type="number" step="0.01" value={fixedLaborCost} onChange={(event) => setFixedLaborCost(Number(event.target.value))} /></div>
              <div className="grid gap-2"><Label>Tempo mao de obra (min)</Label><Input name="labor_time_minutes" type="number" value={laborTimeMinutes} onChange={(event) => setLaborTimeMinutes(Number(event.target.value))} /></div>
              <div className="grid gap-2"><Label>Preco manual</Label><Input name="manual_sale_price" type="number" step="0.01" /></div>
              <div className="grid gap-2"><Label>Estoque acabado</Label><Input name="finished_stock_quantity" type="number" defaultValue={0} /></div>
              <div className="grid gap-2"><Label>Estoque minimo</Label><Input name="minimum_finished_stock" type="number" defaultValue={0} /></div>
              <div className="grid gap-2 sm:col-span-3"><Label>Descricao</Label><Textarea name="description" /></div>
            </div>

            <div className="grid gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Partes do produto</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, createLine(current.length, filaments[0]?.id ?? "")])}>
                  <Plus className="size-4" />
                  Adicionar parte
                </Button>
              </div>
              {lines.map((line, index) => (
                <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_130px_40px] sm:items-end">
                  <div className="grid gap-1">
                    <Label htmlFor={`part-name-${line.id}`} className="text-xs">Nome da parte {index + 1}</Label>
                    <Input id={`part-name-${line.id}`} value={line.name} placeholder="Ex.: base, tampa, dino amarelo" onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, name: event.target.value } : item)))} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`part-filament-${line.id}`} className="text-xs">Rolo base</Label>
                    <select id={`part-filament-${line.id}`} value={line.filamentId} onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, filamentId: event.target.value } : item)))} className={selectClassName}>
                      <option value="">Selecione</option>
                      {filaments.map((filament) => <option key={filament.id} value={filament.id}>{filament.name}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`part-weight-${line.id}`} className="text-xs">Peso (g)</Label>
                    <Input id={`part-weight-${line.id}`} type="number" step="0.01" min={0} value={line.weightGrams} onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, weightGrams: Number(event.target.value) } : item)))} />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`part-time-${line.id}`} className="text-xs">Tempo (min)</Label>
                    <Input id={`part-time-${line.id}`} type="number" step="1" min={0} value={line.printTimeMinutes} onChange={(event) => setLines((current) => current.map((item) => (item.id === line.id ? { ...item, printTimeMinutes: Number(event.target.value) } : item)))} />
                  </div>
                  <Button type="button" size="icon" variant="ghost" aria-label="Remover parte" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid gap-3 rounded-md border p-3">
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
                      <Label htmlFor={`product-supply-${line.id}`} className="text-xs">Componente {index + 1}</Label>
                      <select id={`product-supply-${line.id}`} value={line.supplyId} onChange={(event) => setSupplyLines((current) => current.map((item) => (item.id === line.id ? { ...item, supplyId: event.target.value } : item)))} className={selectClassName}>
                        <option value="">Selecione</option>
                        {supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} - estoque {supply.current_quantity}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor={`product-supply-qty-${line.id}`} className="text-xs">Qtd. por produto</Label>
                      <Input id={`product-supply-qty-${line.id}`} type="number" step="0.01" min={0} value={line.quantity} onChange={(event) => setSupplyLines((current) => current.map((item) => (item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item)))} />
                    </div>
                    <Button type="button" size="icon" variant="ghost" aria-label="Remover componente" onClick={() => setSupplyLines((current) => current.filter((item) => item.id !== line.id))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Adicione aqui itens como clicker, imas, parafusos ou partes impressas usadas na montagem.</p>
              )}
            </div>

            <div className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Previa de custos</Label>
                <span className="text-sm text-muted-foreground">Por unidade: {formatCurrency(pricing.unitCost)}</span>
              </div>
              <div className="grid gap-3 text-sm lg:grid-cols-2">
                <div className="grid gap-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Filamento total</span>
                    <strong>{formatCurrency(pricing.filamentCost)}</strong>
                  </div>
                  {validFilamentLines.length ? validFilamentLines.map((line) => (
                    <div key={line.id} className="flex justify-between gap-3 pl-3 text-muted-foreground">
                      <span>{line.name} ({formatDecimal(line.weight)} g)</span>
                      <span>{formatCurrency(line.cost)}</span>
                    </div>
                  )) : (
                    <div className="pl-3 text-muted-foreground">Informe os pesos para ver o gasto de filamento.</div>
                  )}
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Componentes</span>
                    <strong>{formatCurrency(pricing.supplyCost)}</strong>
                  </div>
                  {validSupplyLines.map((line) => (
                    <div key={line.id} className="flex justify-between gap-3 pl-3 text-muted-foreground">
                      <span>{line.name} x {formatDecimal(line.quantity)}</span>
                      <span>{formatCurrency(line.cost)}</span>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Energia</span><strong>{formatCurrency(pricing.energyCost)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Maquina</span><strong>{formatCurrency(pricing.machineCost)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Embalagem</span><strong>{formatCurrency(pricing.packagingCost)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Mao de obra</span><strong>{formatCurrency(pricing.laborCost)}</strong></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Desperdicio</span><strong>{formatCurrency(pricing.wasteCost)}</strong></div>
                  <div className="mt-1 border-t pt-2">
                    <div className="flex justify-between gap-3"><span className="font-medium">Custo do lote</span><strong>{formatCurrency(pricing.totalBatchCost)}</strong></div>
                    <div className="flex justify-between gap-3"><span className="font-medium">Preco sugerido</span><strong>{formatCurrency(pricing.suggestedUnitPrice)}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar produto"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
