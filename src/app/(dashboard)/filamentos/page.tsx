import { PackageX } from "lucide-react";
import { createFilamentAction } from "@/actions/records";
import { EmptyState } from "@/components/layout/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleFormCard } from "@/components/layout/simple-form-card";
import { FilamentActions } from "@/components/inventory/filament-actions";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MATERIALS } from "@/lib/constants";
import { listTable } from "@/lib/data/queries";
import { formatCurrency, formatDate, formatWeight } from "@/lib/formatters";

export default async function FilamentsPage() {
  const filaments = (await listTable("filaments")).filter((item) => item.active);
  return (
    <PageShell title="Filamentos" description="Cadastro, custo por grama e alertas de estoque.">
      <SimpleFormCard
        title="Novo filamento"
        action={createFilamentAction}
        submitLabel="Cadastrar filamento"
        fields={[
          { name: "name", label: "Nome", placeholder: "PLA branco" },
          { name: "brand", label: "Marca" },
          { name: "material", label: "Material", kind: "select", options: MATERIALS, defaultValue: "PLA" },
          { name: "color_name", label: "Cor" },
          { name: "color_hex", label: "Hex da cor", placeholder: "#ffffff" },
          { name: "supplier", label: "Fornecedor" },
          { name: "initial_weight_grams", label: "Peso inicial (g)", type: "number", defaultValue: 1000 },
          { name: "current_weight_grams", label: "Peso atual (g)", type: "number", defaultValue: 1000 },
          { name: "spool_weight_grams", label: "Peso do carretel (g)", type: "number", defaultValue: 0 },
          { name: "purchase_price", label: "Preco de compra", type: "number", defaultValue: 99 },
          { name: "minimum_stock_grams", label: "Estoque minimo (g)", type: "number", defaultValue: 150 },
          { name: "purchase_date", label: "Data de compra", type: "date" },
          { name: "lot_number", label: "Lote" },
          { name: "notes", label: "Observacoes", kind: "textarea" },
        ]}
      />
      {filaments.length ? (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filamento</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Custo/g</TableHead>
                <TableHead>Valor restante</TableHead>
                <TableHead>Compra</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filaments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="size-4 rounded-full border" style={{ backgroundColor: item.color_hex ?? "#e5e7eb" }} />
                      <span className="font-medium">{item.name}</span>
                      {item.current_weight_grams <= item.minimum_stock_grams ? <Badge variant="destructive">Baixo</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>{item.material}</TableCell>
                  <TableCell className="min-w-40">
                    <Progress value={(item.current_weight_grams / item.initial_weight_grams) * 100} />
                    <span className="text-xs text-muted-foreground">{formatWeight(item.current_weight_grams)}</span>
                  </TableCell>
                  <TableCell>{formatCurrency(item.cost_per_gram)}</TableCell>
                  <TableCell>{formatCurrency(item.current_weight_grams * item.cost_per_gram)}</TableCell>
                  <TableCell>{formatDate(item.purchase_date)}</TableCell>
                  <TableCell>
                    <FilamentActions filament={item} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={PackageX} title="Nenhum filamento cadastrado" description="Cadastre o primeiro rolo para calcular custos reais." />
      )}
    </PageShell>
  );
}
