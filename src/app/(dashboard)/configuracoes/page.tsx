import { updateSettingsAction } from "@/actions/records";
import { PageShell } from "@/components/layout/page-shell";
import { SimpleFormCard } from "@/components/layout/simple-form-card";
import { getCurrentProfile } from "@/lib/supabase/session";

export default async function SettingsPage() {
  const { supabase, profile } = await getCurrentProfile();
  const { data: settings } = await supabase.from("organization_settings").select("*").eq("organization_id", profile.organization_id ?? "").single();
  return (
    <PageShell title="Configuracoes" description="Variaveis globais dos calculos de custo e precificacao.">
      <SimpleFormCard
        title="Empresa"
        action={updateSettingsAction}
        submitLabel="Salvar configuracoes"
        modal={false}
        fields={[
          { name: "energy_cost_per_kwh", label: "Energia R$/kWh", type: "number", defaultValue: settings?.energy_cost_per_kwh ?? 1.1 },
          { name: "default_labor_cost_per_hour", label: "Mao de obra/h", type: "number", defaultValue: settings?.default_labor_cost_per_hour ?? 0 },
          { name: "default_waste_percentage", label: "Desperdicio %", type: "number", defaultValue: settings?.default_waste_percentage ?? 5 },
          { name: "default_markup", label: "Markup", type: "number", defaultValue: settings?.default_markup ?? 2.5 },
        ]}
      />
    </PageShell>
  );
}
