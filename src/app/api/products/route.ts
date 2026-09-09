import { NextRequest, NextResponse } from "next/server";
import { assertAutomationSecret } from "@/lib/miner/auth";
import { getMinerProducts } from "@/lib/miner/repository";

export async function GET(request: NextRequest) {
  try {
    assertAutomationSecret(request);
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId obrigatorio" }, { status: 400 });
    return NextResponse.json({ products: await getMinerProducts(organizationId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 401 });
  }
}
