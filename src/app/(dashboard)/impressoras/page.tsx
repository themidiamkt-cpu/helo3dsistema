import { Printer } from "lucide-react";
import { createPrinterAction } from "@/actions/records";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleFormCard } from "@/components/layout/simple-form-card";
import { PrinterActions } from "@/components/production/printer-actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PRINTER_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDate, formatDecimal } from "@/lib/formatters";

export default async function PrintersPage() {
  const printers = (await listTable("printers")).filter((item) => item.active);
  return (
    <PageShell title="Impressoras" description="Capacidade, status e custo-hora das maquinas.">
      <SimpleFormCard
        title="Nova impressora"
        action={createPrinterAction}
        submitLabel="Cadastrar impressora"
        fields={[
          { name: "name", label: "Nome", placeholder: "Bambu Lab A1" },
          { name: "model", label: "Modelo", placeholder: "A1 Combo" },
          { name: "power_watts", label: "Consumo medio (W)", type: "number", defaultValue: 80 },
          { name: "machine_cost_per_hour", label: "Custo por hora", type: "number", defaultValue: 3 },
          { name: "purchase_price", label: "Preco de compra", type: "number" },
          { name: "purchase_date", label: "Data de compra", type: "date" },
          { name: "status", label: "Status", kind: "select", options: PRINTER_STATUSES, defaultValue: "available" },
          { name: "total_printed_hours", label: "Horas impressas", type: "number", defaultValue: 0 },
          { name: "maintenance_interval_hours", label: "Intervalo de manutencao (h)", type: "number" },
          { name: "notes", label: "Observacoes", kind: "textarea" },
        ]}
      />
      {printers.length ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Impressora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead>Custo/h</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}<span className="block text-xs text-muted-foreground">{item.model}</span></TableCell>
                  <TableCell><Badge variant={item.status === "printing" ? "default" : "secondary"}>{STATUS_LABELS[item.status]}</Badge></TableCell>
                  <TableCell>{formatDecimal(item.power_watts, 0)} W</TableCell>
                  <TableCell>{formatCurrency(item.machine_cost_per_hour)}</TableCell>
                  <TableCell>{formatDecimal(item.total_printed_hours)} h</TableCell>
                  <TableCell>{formatDate(item.purchase_date)}</TableCell>
                  <TableCell>
                    <PrinterActions printer={item} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Printer} title="Nenhuma impressora cadastrada" description="Cadastre uma maquina para usar consumo e custo-hora nos produtos." />
      )}
    </PageShell>
  );
}
