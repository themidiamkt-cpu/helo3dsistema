import { NextRequest, NextResponse } from "next/server";
import { assertAutomationSecret } from "@/lib/miner/auth";

export async function POST(request: NextRequest) {
  try {
    assertAutomationSecret(request);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY nao configurada. Analises por IA ficaram pendentes." }, { status: 503 });
    }
    return NextResponse.json({ status: "PENDING_IMPLEMENTATION", processed: 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 401 });
  }
}
