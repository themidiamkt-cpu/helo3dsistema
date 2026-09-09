import { NextRequest, NextResponse } from "next/server";
import { assertAutomationSecret } from "@/lib/miner/auth";
import { collectMinerProducts } from "@/lib/miner/collector";

export async function POST(request: NextRequest) {
  try {
    assertAutomationSecret(request);
    const body = await request.json();
    if (!body.organizationId) return NextResponse.json({ error: "organizationId obrigatorio" }, { status: 400 });
    return NextResponse.json({
      result: await collectMinerProducts({ organizationId: body.organizationId, marketplace: "SHOPEE", keyword: body.keyword, limit: body.limit }),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 401 });
  }
}
