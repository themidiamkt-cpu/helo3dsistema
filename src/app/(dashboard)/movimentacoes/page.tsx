import { PageShell } from "@/components/layout/page-shell";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTime, formatDecimal } from "@/lib/formatters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MOVEMENT_LABELS: Record<string, string> = {
  production_consumption: "Consumo na producao",
  production_output: "Entrada de producao",
  production_loss: "Perda de producao",
  loss: "Perda",
  printed_part_output: "Entrada de parte impressa",
  assembly_consumption: "Saida para montagem",
  assembly_output: "Entrada de montagem",
  sale: "Venda",
  purchase: "Compra",
  return: "Estorno / devolucao",
  cancellation: "Cancelamento",
  adjustment: "Ajuste",
};

export default async function MovementsPage() {
  const supabase = await createClient();
  const [filaments, supplies, products] = await Promise.all([
    supabase.from("filament_movements").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("supply_movements").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("finished_product_movements").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const movements = [
    ...(filaments.data ?? []).map((item) => ({ ...item, group: "Filamento" })),
    ...(supplies.data ?? []).map((item) => ({ ...item, group: "Componente" })),
    ...(products.data ?? []).map((item) => ({ ...item, group: "Produto" })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <PageShell title="Movimentacoes" description="Historico completo das entradas, saidas, perdas e ajustes.">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Grupo</TableHead><TableHead>Tipo</TableHead><TableHead>Quantidade</TableHead><TableHead>Saldo</TableHead><TableHead>Total</TableHead><TableHead>Obs.</TableHead></TableRow></TableHeader>
          <TableBody>
            {movements.map((item) => (
              <TableRow key={`${item.group}-${item.id}`}>
                <TableCell>{formatDateTime(item.created_at)}</TableCell>
                <TableCell>{item.group}</TableCell>
                <TableCell>{MOVEMENT_LABELS[item.movement_type] ?? item.movement_type}</TableCell>
                <TableCell>{formatDecimal(item.quantity)}</TableCell>
                <TableCell>
                  {formatDecimal(item.previous_balance)} {"->"} {formatDecimal(item.new_balance)}
                </TableCell>
                <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                <TableCell className="max-w-80 text-muted-foreground">{item.notes ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  );
}
