"use client";

import { useMemo, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { calculatePricing } from "@/lib/calculations/pricing";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { formatCurrency, formatDecimal } from "@/lib/formatters";
import type { Database, Filament, InventorySupply, Printer, Product, ProductFilament } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FilamentLine = { id: string; filamentId: string; weightGrams: number };
type SupplyLine = { id: string; supplyId: string; quantity: number };
type Settings = Database["public"]["Tables"]["organization_settings"]["Row"] | null;
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PricingSimulator({
  filaments,
  supplies,
  printers,
  products,
  templates,
  settings,
}: {
  filaments: Filament[];
  supplies: InventorySupply[];
  printers: Printer[];
  products: Product[];
  templates: ProductFilament[];
  settings: Settings;
}) {
  const [filamentLines, setFilamentLines] = useState<FilamentLine[]>([{ id: crypto.randomUUID(), filamentId: filaments[0]?.id ?? "", weightGrams: 0 }]);
  const [supplyLines, setSupplyLines] = useState<SupplyLine[]>([]);
  const [productId, setProductId] = useState("");
  const [printerId, setPrinterId] = useState(printers[0]?.id ?? "");
  const [printHours, setPrintHours] = useState(10);
  const [printMinutes, setPrintMinutes] = useState(54);
  const [batchQuantity, setBatchQuantity] = useState(5);
  const [packagingCost, setPackagingCost] = useState(0);
  const [fixedLaborCost, setFixedLaborCost] = useState(0);
  const [laborMinutes, setLaborMinutes] = useState(0);
  const [markup, setMarkup] = useState<number>(settings?.default_markup ?? DEFAULT_SETTINGS.markup);
  const selectedPrinter = printers.find((printer) => printer.id === printerId);

  function handleProductChange(nextProductId: string | null) {
    if (!nextProductId) return;
    const product = products.find((item) => item.id === nextProductId);
    if (!product) return;
    setProductId(nextProductId);
    setPrinterId(product.printer_id ?? printers[0]?.id ?? "");
    setPrintHours(Math.floor(product.print_time_minutes / 60));
    setPrintMinutes(product.print_time_minutes % 60);
    setBatchQuantity(product.batch_quantity);
    setPackagingCost(product.packaging_cost);
    setFixedLaborCost(product.fixed_labor_cost);
    setLaborMinutes(product.labor_time_minutes);
    setMarkup(product.desired_markup);
    const weights = templates.filter((template) => template.product_id === product.id).map((template) => template.weight_grams);
    setFilamentLines(weights.length ? weights.map((weight) => ({ id: crypto.randomUUID(), filamentId: filaments[0]?.id ?? "", weightGrams: weight })) : [{ id: crypto.randomUUID(), filamentId: filaments[0]?.id ?? "", weightGrams: 0 }]);
  }

  const result = useMemo(() => {
    return calculatePricing({
      filaments: filamentLines.map((line) => {
        const filament = filaments.find((item) => item.id === line.filamentId);
        return { weightGrams: line.weightGrams, costPerGram: filament?.cost_per_gram ?? 0 };
      }),
      supplies: supplyLines.map((line) => {
        const supply = supplies.find((item) => item.id === line.supplyId);
        return { quantity: line.quantity, unitCost: supply?.unit_cost ?? 0 };
      }),
      printTimeMinutes: printHours * 60 + printMinutes,
      batchQuantity,
      packagingCost,
      fixedLaborCost,
      laborTimeMinutes: laborMinutes,
      laborCostPerHour: settings?.default_labor_cost_per_hour ?? DEFAULT_SETTINGS.laborCostPerHour,
      machineCostPerHour: selectedPrinter?.machine_cost_per_hour ?? 0,
      energyCostPerKwh: settings?.energy_cost_per_kwh ?? DEFAULT_SETTINGS.energyCostPerKwh,
      printerPowerWatts: selectedPrinter?.power_watts ?? 0,
      wastePercentage: settings?.default_waste_percentage ?? DEFAULT_SETTINGS.wastePercentage,
      markup,
    });
  }, [batchQuantity, filamentLines, filaments, fixedLaborCost, laborMinutes, markup, packagingCost, printHours, printMinutes, selectedPrinter, settings, supplies, supplyLines]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calculator className="size-5" /> Simulacao</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,1.4fr)_minmax(220px,0.8fr)]">
            <div className="grid gap-2">
              <Label>Produto</Label>
              <select value={productId} onChange={(event) => handleProductChange(event.target.value)} className={selectClassName}>
                <option value="">Simular a partir de um produto</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Impressora</Label>
              <select value={printerId} onChange={(event) => setPrinterId(event.target.value)} className={selectClassName}>
                <option value="">Selecione a impressora</option>
                {printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}{printer.model ? ` - ${printer.model}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label>Horas</Label>
              <Input type="number" value={printHours} onChange={(event) => setPrintHours(Number(event.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Minutos</Label>
              <Input type="number" value={printMinutes} onChange={(event) => setPrintMinutes(Number(event.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label>Quantidade</Label>
              <Input type="number" value={batchQuantity} onChange={(event) => setBatchQuantity(Math.max(1, Number(event.target.value)))} />
            </div>
            <div className="grid gap-2">
              <Label>Markup</Label>
              <Input type="number" step="0.1" value={markup} onChange={(event) => setMarkup(Math.max(0.1, Number(event.target.value)))} />
            </div>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Filamentos</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => setFilamentLines((lines) => [...lines, { id: crypto.randomUUID(), filamentId: filaments[0]?.id ?? "", weightGrams: 0 }])}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            {filamentLines.map((line) => (
              <div key={line.id} className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_140px_40px]">
                <select value={line.filamentId} onChange={(event) => setFilamentLines((lines) => lines.map((item) => (item.id === line.id ? { ...item, filamentId: event.target.value } : item)))} className={selectClassName}>
                  <option value="">Filamento</option>
                  {filaments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <Input type="number" placeholder="Peso (g)" value={line.weightGrams} onChange={(event) => setFilamentLines((lines) => lines.map((item) => (item.id === line.id ? { ...item, weightGrams: Number(event.target.value) } : item)))} />
                <Button type="button" size="icon" variant="ghost" aria-label="Remover filamento" onClick={() => setFilamentLines((lines) => lines.filter((item) => item.id !== line.id))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Componentes</h2>
              <Button type="button" size="sm" variant="outline" onClick={() => setSupplyLines((lines) => [...lines, { id: crypto.randomUUID(), supplyId: supplies[0]?.id ?? "", quantity: 1 }])}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            {supplyLines.map((line) => (
              <div key={line.id} className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_140px_40px]">
                <select value={line.supplyId} onChange={(event) => setSupplyLines((lines) => lines.map((item) => (item.id === line.id ? { ...item, supplyId: event.target.value } : item)))} className={selectClassName}>
                  <option value="">Componente</option>
                  {supplies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <Input type="number" placeholder="Quantidade" value={line.quantity} onChange={(event) => setSupplyLines((lines) => lines.map((item) => (item.id === line.id ? { ...item, quantity: Number(event.target.value) } : item)))} />
                <Button type="button" size="icon" variant="ghost" aria-label="Remover componente" onClick={() => setSupplyLines((lines) => lines.filter((item) => item.id !== line.id))}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2"><Label>Embalagem</Label><Input type="number" value={packagingCost} onChange={(event) => setPackagingCost(Number(event.target.value))} /></div>
            <div className="grid gap-2"><Label>Mao de obra fixa</Label><Input type="number" value={fixedLaborCost} onChange={(event) => setFixedLaborCost(Number(event.target.value))} /></div>
            <div className="grid gap-2"><Label>Tempo de mao de obra (min)</Label><Input type="number" value={laborMinutes} onChange={(event) => setLaborMinutes(Number(event.target.value))} /></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resultado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Custo total</span><strong className="text-right">{formatCurrency(result.totalBatchCost)}</strong>
            <span className="text-muted-foreground">Custo unitario</span><strong className="text-right">{formatCurrency(result.unitCost)}</strong>
            <span className="text-muted-foreground">Preco sugerido</span><strong className="text-right">{formatCurrency(result.suggestedUnitPrice)}</strong>
            <span className="text-muted-foreground">Lucro bruto lote</span><strong className="text-right">{formatCurrency(result.grossProfit)}</strong>
            <span className="text-muted-foreground">Margem sobre venda</span><strong className="text-right">{formatDecimal(result.salesMarginPercentage)}%</strong>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Markup</TableHead><TableHead>Unidade</TableHead><TableHead>Margem</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.markupOptions.map((option) => (
                <TableRow key={option.markup}>
                  <TableCell>{formatDecimal(option.markup, 1)}</TableCell>
                  <TableCell>{formatCurrency(option.unitPrice)}</TableCell>
                  <TableCell>{formatDecimal(option.salesMarginPercentage)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
