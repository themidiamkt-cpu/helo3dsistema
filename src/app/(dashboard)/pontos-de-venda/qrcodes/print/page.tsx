import QRCode from "qrcode";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/supabase/session";

function publicUrl(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl}/pdv/${token}`;
}

export default async function PrintSalesPointQRCodesPage() {
  const { supabase, profile } = await getCurrentProfile();
  const orgId = profile.organization_id ?? "";
  const [qrResult, pointsResult, productsResult] = await Promise.all([
    supabase.from("sales_point_qrcodes").select("*").eq("organization_id", orgId).eq("status", "active").order("created_at"),
    supabase.from("sales_points").select("id, name").eq("organization_id", orgId),
    supabase.from("products").select("id, name").eq("organization_id", orgId),
  ]);

  const points = new Map((pointsResult.data ?? []).map((point) => [point.id, point.name]));
  const products = new Map((productsResult.data ?? []).map((product) => [product.id, product.name]));
  const qrs = await Promise.all((qrResult.data ?? []).map(async (qr) => ({
    ...qr,
    image: await QRCode.toDataURL(publicUrl(qr.token), { margin: 1, width: 220 }),
  })));

  return (
    <PageShell title="Impressao A4 de QR Codes" description="Use a impressao do navegador para gerar as etiquetas dos pontos.">
      <style>{`
        @media print {
          aside, nav, header, button { display: none !important; }
          main { padding: 0 !important; }
          .qr-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8mm !important; }
          .qr-card { break-inside: avoid; box-shadow: none !important; }
        }
      `}</style>
      <Card>
        <CardContent className="qr-grid grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {qrs.map((qr) => (
            <div key={qr.id} className="qr-card grid gap-2 rounded-md border p-4 text-center">
              <img src={qr.image} alt={`QR ${qr.token}`} className="mx-auto size-44" />
              <div className="text-sm font-semibold">{products.get(qr.product_id) ?? "Produto"}</div>
              <div className="text-xs text-muted-foreground">{points.get(qr.sales_point_id) ?? "Ponto"} - {qr.token}</div>
              <div className="break-all text-[10px] text-muted-foreground">{publicUrl(qr.token)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageShell>
  );
}
