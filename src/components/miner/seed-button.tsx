import { Database } from "lucide-react";
import { seedMinerDemoAction } from "@/actions/miner";
import { Button } from "@/components/ui/button";

export function SeedMinerButton() {
  return (
    <form action={seedMinerDemoAction}>
      <Button variant="outline">
        <Database className="size-4" />
        Dados demo
      </Button>
    </form>
  );
}
