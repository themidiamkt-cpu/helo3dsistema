import { Search } from "lucide-react";
import { collectMinerAction } from "@/actions/miner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CollectForm() {
  return (
    <form action={collectMinerAction} className="grid gap-3 sm:grid-cols-[160px_1fr_120px_auto]">
      <div className="grid gap-1">
        <Label>Marketplace</Label>
        <select name="marketplace" className="h-8 rounded-lg border bg-background px-2 text-sm">
          <option value="MERCADO_LIVRE">Mercado Livre</option>
          <option value="SHOPEE">Shopee</option>
        </select>
      </div>
      <div className="grid gap-1">
        <Label>Keyword opcional</Label>
        <Input name="keyword" placeholder="Ex.: porta controle 3d" />
      </div>
      <div className="grid gap-1">
        <Label>Limite</Label>
        <Input name="limit" type="number" min="1" max="100" defaultValue="20" />
      </div>
      <Button className="self-end">
        <Search className="size-4" />
        Coletar
      </Button>
    </form>
  );
}
