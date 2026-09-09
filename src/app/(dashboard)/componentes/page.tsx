import { Box } from "lucide-react";
import { createSupplyAction } from "@/actions/records";
import { EmptyState } from "@/components/layout/empty-state";
import { SupplyActions } from "@/components/inventory/supply-actions";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleFormCard } from "@/components/layout/simple-form-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SUPPLY_CATEGORIES, SUPPLY_UNITS } from "@/lib/constants";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDecimal } from "@/lib/formatters";

export default async function SuppliesPage() {
  const supplies = (await listTable("inventory_supplies")).filter((item) => item.active);
  return (
    <PageShell title="Componentes" description="Componentes, embalagens, insumos e acessorios.">
      <SimpleFormCard
        title="Novo item"
        action={createSupplyAction}
        submitLabel="Cadastrar item"
        fields={[
          { name: "name", label: "Nome", placeholder: "Clicker" },
          { name: "sku", label: "SKU" },
          { name: "category", label: "Categoria", kind: "select", options: SUPPLY_CATEGORIES, defaultValue: "clicker" },
          { name: "unit", label: "Unidade", kind: "select", options: SUPPLY_UNITS, defaultValue: "unidade" },
          { name: "current_quantity", label: "Quantidade atual", type: "number", defaultValue: 100 },
          { name: "minimum_quantity", label: "Estoque minimo", type: "number", defaultValue: 20 },
          { name: "purchase_quantity", label: "Quantidade comprada", type: "number", defaultValue: 100 },
          { name: "purchase_price", label: "Preco de compra", type: "number", defaultValue: 230 },
          { name: "supplier", label: "Fornecedor" },
          { name: "notes", label: "Observacoes", kind: "textarea" },
        ]}
      />
      {supplies.length ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Custo unitario</TableHead>
                <TableHead>Valor em estoque</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplies.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.name} {item.current_quantity <= item.minimum_quantity ? <Badge variant="destructive">Baixo</Badge> : null}
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{formatDecimal(item.current_quantity)} {item.unit}</TableCell>
                  <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                  <TableCell>{formatCurrency(item.current_quantity * item.unit_cost)}</TableCell>
                  <TableCell>
                    <SupplyActions supply={item} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Box} title="Nenhum componente cadastrado" description="Adicione clickers, embalagens e outros insumos para compor produtos." />
      )}
    </PageShell>
  );
}
