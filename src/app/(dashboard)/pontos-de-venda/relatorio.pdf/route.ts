import { NextResponse } from "next/server";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { buildSimplePdf } from "@/lib/pdf/simple";
import { getCurrentProfile } from "@/lib/supabase/session";

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
  const sales = salesResult.data ?? [];
  const revenue = sales.filter((sale) => sale.status === "completed").reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const commission = sales.filter((sale) => sale.status === "completed").reduce((sum, sale) => sum + Number(sale.commission_amount), 0);
  const lines = [
    `Receita confirmada: ${formatCurrency(revenue)}`,
    `Comissao confirmada: ${formatCurrency(commission)}`,
    "",
    ...sales.map((sale) => `${formatDateTime(sale.created_at)} | ${points.get(sale.sales_point_id) ?? "-"} | ${products.get(sale.product_id) ?? "-"} | ${sale.quantity} un | ${formatCurrency(sale.total_amount)} | ${sale.status}`),
  ];

  return new NextResponse(buildSimplePdf("Relatorio Pontos de Venda", lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="pontos-de-venda.pdf"',
    },
  });
}
