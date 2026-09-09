import Link from "next/link";
import { ListChecks, Package, Search, Settings, Sparkles, Star, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const minerLinks = [
  { href: "/minerador", label: "Painel", icon: Search },
  { href: "/oportunidades", label: "Oportunidades", icon: Target },
  { href: "/minerador/produtos", label: "Produtos", icon: Package },
  { href: "/minerador/emergentes", label: "Emergentes", icon: Sparkles },
  { href: "/minerador/keywords", label: "Keywords", icon: Search },
  { href: "/minerador/favoritos", label: "Favoritos", icon: Star },
  { href: "/minerador/jobs", label: "Jobs", icon: ListChecks },
  { href: "/minerador/configuracoes", label: "Config.", icon: Settings },
];

export function MinerNav() {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-lg bg-muted p-1">
      {minerLinks.map((item) => (
        <Link key={item.href} href={item.href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 gap-2 bg-background/60")}>
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </div>
  );
}
