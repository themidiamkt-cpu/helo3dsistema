import { notFound } from "next/navigation";
import { PublicCheckout } from "@/components/sales-points/public-checkout";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PublicSalesPointPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();
  const { data: qr } = await supabase.from("sales_point_qrcodes").select("*").eq("token", token).eq("status", "active").single();
  if (!qr) notFound();

  const [pointResult, productResult, stockResult] = await Promise.all([
    supabase.from("sales_points").select("*").eq("id", qr.sales_point_id).eq("status", "active").single(),
    supabase.from("products").select("*").eq("id", qr.product_id).eq("active", true).single(),
    supabase.from("sales_point_stock").select("*").eq("sales_point_id", qr.sales_point_id).eq("product_id", qr.product_id).single(),
  ]);

  const point = pointResult.data;
  const product = productResult.data;
  const stock = stockResult.data;
  if (!point || !product || !stock) notFound();

  const price = Number(product.manual_sale_price ?? product.calculated_sale_price ?? 0);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.1fr_420px]">
        <section className="overflow-hidden rounded-xl border bg-background">
          <div className="aspect-[4/3] bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Mimagi 3D</div>
            )}
          </div>
          <div className="grid gap-4 p-5">
            <div>
              <Badge variant={stock.quantity > 0 ? "secondary" : "destructive"}>{stock.quantity} disponivel</Badge>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal">{product.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{point.name}</p>
            </div>
            {product.description ? <p className="leading-7 text-muted-foreground">{product.description}</p> : null}
            <div>
              <p className="text-sm text-muted-foreground">Preco</p>
              <p className="text-4xl font-semibold">{formatCurrency(price)}</p>
            </div>
          </div>
        </section>
        <aside className="md:sticky md:top-6 md:self-start">
          <PublicCheckout token={token} price={price} available={stock.quantity} />
        </aside>
      </div>
    </main>
  );
}
