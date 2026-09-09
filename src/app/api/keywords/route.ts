import { NextRequest, NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAutomationSecret } from "@/lib/miner/auth";

type SupabaseAny = {
  from(table: string): any;
};

export async function POST(request: NextRequest) {
  try {
    assertAutomationSecret(request);
    const body = await request.json();
    const organizationId = String(body.organizationId ?? "");
    const keyword = String(body.keyword ?? "").trim();
    if (!organizationId || !keyword) return NextResponse.json({ error: "organizationId e keyword obrigatorios" }, { status: 400 });
    const supabase = createAdminClient() as unknown as SupabaseAny;
    const { data, error } = await supabase
      .from("miner_keywords")
      .upsert(
        { organization_id: organizationId, keyword, active: body.active ?? true, status: "APPROVED", max_results: body.maxResults ?? 100 },
        { onConflict: "organization_id,keyword" }
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ keyword: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 401 });
  }
}
