import { NextRequest, NextResponse } from "next/server";
import { assertAutomationSecret } from "@/lib/miner/auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertAutomationSecret(request);
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY nao configurada. Analise por IA ficou pendente." }, { status: 503 });
    }
    const { id } = await params;
    return NextResponse.json({ productId: id, status: "PENDING_IMPLEMENTATION", message: "Endpoint reservado para analise IA estruturada." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 401 });
  }
}
