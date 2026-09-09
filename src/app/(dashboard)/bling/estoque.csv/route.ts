import { NextResponse } from "next/server";
import { blingStockHeaders, buildBlingStockRows, toCsv } from "@/lib/bling/export";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("active", true).order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const csv = toCsv(blingStockHeaders, buildBlingStockRows(data ?? []));
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bling-estoque.csv"`,
    },
  });
}

