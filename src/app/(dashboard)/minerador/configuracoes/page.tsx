import { Save } from "lucide-react";
import { updateMinerSettingsAction } from "@/actions/miner";
import { PageShell } from "@/components/layout/page-shell";
import { MinerNav } from "@/components/miner/miner-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMinerContext, getMinerSettings } from "@/lib/miner/repository";

export default async function MinerSettingsPage() {
  const { organizationId } = await getMinerContext();
  const settings = await getMinerSettings(organizationId);
  return (
    <PageShell title="Config. Minerador" description="Parametros usados para pontuar e automatizar o modulo.">
      <MinerNav />
      <Card>
        <CardHeader>
          <CardTitle>Configuracoes gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateMinerSettingsAction} className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-1">
              <Label>Probabilidade minima 3D (%)</Label>
              <Input name="probability_threshold" type="number" defaultValue={settings?.probability_threshold ?? 70} />
            </div>
            <div className="grid gap-1">
              <Label>PLA R$/kg</Label>
              <Input name="pla_cost_per_kg" type="number" step="0.01" defaultValue={settings?.pla_cost_per_kg ?? 99} />
            </div>
            <div className="grid gap-1">
              <Label>PETG R$/kg</Label>
              <Input name="petg_cost_per_kg" type="number" step="0.01" defaultValue={settings?.petg_cost_per_kg ?? 110} />
            </div>
            <div className="grid gap-1">
              <Label>Maquina R$/h</Label>
              <Input name="machine_cost_per_hour" type="number" step="0.01" defaultValue={settings?.machine_cost_per_hour ?? 3} />
            </div>
            <div className="grid gap-1">
              <Label>Max. resultados por keyword</Label>
              <Input name="max_results_per_keyword" type="number" defaultValue={settings?.max_results_per_keyword ?? 100} />
            </div>
            <div className="grid gap-1">
              <Label>Intervalo coleta (h)</Label>
              <Input name="collection_interval_hours" type="number" defaultValue={settings?.collection_interval_hours ?? 24} />
            </div>
            <div className="grid gap-1">
              <Label>Modelo IA</Label>
              <Input name="openai_model" defaultValue={settings?.openai_model ?? "gpt-5-mini"} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input name="mercadolivre_enabled" type="checkbox" defaultChecked={settings?.mercadolivre_enabled ?? true} />
              Mercado Livre ativo
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input name="shopee_enabled" type="checkbox" defaultChecked={settings?.shopee_enabled ?? true} />
              Shopee ativo
            </label>
            <div className="md:col-span-3">
              <Button>
                <Save className="size-4" />
                Salvar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
