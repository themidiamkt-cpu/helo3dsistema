import { NextResponse } from "next/server";
import { formatDateTime } from "@/lib/formatters";
import { getCurrentProfile } from "@/lib/supabase/session";

function csv(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  const orgId = profile.organization_id ?? "";
  const [salesResult, pointsResult, productsResult] = await Promise.all([
    supabase.from("sales_point_sales").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("sales_points").select("id, name").eq("organization_id", orgId),
    supabase.from("products").select("id, name").eq("organization_id", orgId),
  ]);

  const points = new Map((pointsResult.data ?? []).map((point) => [point.id, point.name]));
  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
  const rows = [
    ["Data", "Ponto", "Produto", "Cliente", "Qtd", "Valor", "Comissao", "Empresa", "Status"],
    ...(salesResult.data ?? []).map((sale) => [
      formatDateTime(sale.created_at),
      points.get(sale.sales_point_id) ?? "",
      products.get(sale.product_id) ?? "",
      sale.customer_name ?? "",
      sale.quantity,
      sale.total_amount,
      sale.commission_amount,
      sale.company_amount,
      sale.status,
    ]),
  ];

  return new NextResponse(rows.map((row) => row.map(csv).join(";")).join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pontos-de-venda.csv"',
    },
  });
}
