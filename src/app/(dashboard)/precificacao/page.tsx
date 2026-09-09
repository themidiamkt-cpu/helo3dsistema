import { PageShell } from "@/components/layout/page-shell";
import { PricingSimulator } from "@/components/pricing/pricing-simulator";
import { listTable } from "@/lib/data/queries";
import { getCurrentProfile } from "@/lib/supabase/session";

export default async function PricingPage() {
  const { supabase, profile } = await getCurrentProfile();
  const [filaments, supplies, printers, products, templates, settingsResult] = await Promise.all([
    listTable("filaments"),
    listTable("inventory_supplies"),
    listTable("printers"),
    listTable("products"),
    supabase.from("product_filaments").select("*").eq("organization_id", profile.organization_id ?? ""),
    supabase.from("organization_settings").select("*").eq("organization_id", profile.organization_id ?? "").single(),
  ]);
  return (
    <PageShell title="Precificacao" description="Simule custos em tempo real e compare markups sem salvar.">
      <PricingSimulator
        filaments={filaments.filter((item) => item.active)}
        supplies={supplies.filter((item) => item.active)}
        printers={printers.filter((item) => item.active)}
        products={products.filter((item) => item.active)}
        templates={templates.data ?? []}
        settings={settingsResult.data}
      />
    </PageShell>
  );
}
