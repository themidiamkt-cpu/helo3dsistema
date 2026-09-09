import { NextResponse } from "next/server";
import { createAsaasPixPayment } from "@/lib/asaas/client";
import { createAdminClient } from "@/lib/supabase/admin";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = optionalText(body.token);
    const quantity = Math.max(1, Number(body.quantity) || 1);
    if (!token) return NextResponse.json({ error: "QR Code invalido." }, { status: 400 });

    const supabase = createAdminClient();
    const { data: qr, error: qrError } = await supabase
      .from("sales_point_qrcodes")
      .select("*")
      .eq("token", token)
      .eq("status", "active")
      .single();

    if (qrError || !qr) return NextResponse.json({ error: "QR Code nao encontrado." }, { status: 404 });

    const [pointResult, productResult, stockResult] = await Promise.all([
      supabase.from("sales_points").select("*").eq("id", qr.sales_point_id).eq("status", "active").single(),
      supabase.from("products").select("*").eq("id", qr.product_id).eq("active", true).single(),
      supabase.from("sales_point_stock").select("*").eq("sales_point_id", qr.sales_point_id).eq("product_id", qr.product_id).single(),
    ]);

    if (pointResult.error || !pointResult.data) return NextResponse.json({ error: "Ponto de venda inativo." }, { status: 404 });
    if (productResult.error || !productResult.data) return NextResponse.json({ error: "Produto indisponivel." }, { status: 404 });
    if (stockResult.error || !stockResult.data || stockResult.data.quantity < quantity) {
      return NextResponse.json({ error: "Estoque insuficiente neste ponto." }, { status: 400 });
    }

    const product = productResult.data;
    const point = pointResult.data;
    const unitPrice = Number(product.manual_sale_price ?? product.calculated_sale_price ?? 0);
    const totalAmount = Math.round(unitPrice * quantity * 100) / 100;
    const commissionPercentage = Number(point.commission_percentage ?? 0);
    const commissionAmount = Math.round(totalAmount * commissionPercentage) / 100;
    const companyAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;

    const { data: sale, error: saleError } = await supabase
      .from("sales_point_sales")
      .insert({
        organization_id: qr.organization_id,
        sales_point_id: qr.sales_point_id,
        product_id: qr.product_id,
        qrcode_id: qr.id,
        customer_name: optionalText(body.customer_name),
        customer_phone: optionalText(body.customer_phone),
        customer_email: optionalText(body.customer_email),
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        commission_percentage: commissionPercentage,
        commission_amount: commissionAmount,
        company_amount: companyAmount,
      })
      .select("*")
      .single();

    if (saleError || !sale) return NextResponse.json({ error: saleError?.message ?? "Nao foi possivel criar a venda." }, { status: 500 });

    const pix = await createAsaasPixPayment({
      value: totalAmount,
      description: `${product.name} - ${point.name}`,
      externalReference: sale.id,
      customer: {
        name: sale.customer_name,
        email: sale.customer_email,
        phone: sale.customer_phone,
      },
    });

    await supabase
      .from("sales_point_sales")
      .update({
        payment_id: pix.paymentId,
        payment_status: pix.simulated ? "simulated" : "awaiting_payment",
        pix_qr_code: pix.qrCodeImage,
        pix_copy_paste: pix.copyPaste,
        pix_expires_at: pix.expiresAt,
      })
      .eq("id", sale.id);

    return NextResponse.json({
      saleId: sale.id,
      amount: totalAmount,
      qrCodeImage: pix.qrCodeImage,
      copyPaste: pix.copyPaste,
      expiresAt: pix.expiresAt,
      simulated: pix.simulated,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro inesperado." }, { status: 500 });
  }
}
