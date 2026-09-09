import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CONFIRMED_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

function headerToken(request: Request) {
  return request.headers.get("asaas-access-token") ?? request.headers.get("x-asaas-token") ?? request.headers.get("access_token");
}

export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expectedToken && headerToken(request) !== expectedToken) {
    return NextResponse.json({ error: "Webhook nao autorizado." }, { status: 401 });
  }

  const payload = await request.json();
  const event = String(payload.event ?? "");
  if (!CONFIRMED_EVENTS.has(event)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = payload.payment ?? {};
  const paymentId = typeof payment.id === "string" ? payment.id : null;
  const externalReference = typeof payment.externalReference === "string" ? payment.externalReference : null;
  if (!paymentId && !externalReference) {
    return NextResponse.json({ error: "Pagamento sem referencia." }, { status: 400 });
  }

  const supabase = createAdminClient();
  let saleId = externalReference;

  if (!saleId && paymentId) {
    const { data } = await supabase.from("sales_point_sales").select("id").eq("payment_id", paymentId).single();
    saleId = data?.id ?? null;
  }

  if (!saleId) return NextResponse.json({ error: "Venda nao encontrada." }, { status: 404 });

  const { error } = await supabase.rpc("confirm_sales_point_sale", {
    p_sale_id: saleId,
    p_payment_id: paymentId,
    p_raw_payload: payload,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
