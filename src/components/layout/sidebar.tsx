import Link from "next/link";
import { Box, Calculator, Factory, FileSpreadsheet, Gauge, Home, Layers3, MapPin, Package, Printer, ReceiptText, Search, Settings, Shirt, TableProperties } from "lucide-react";
import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/minerador", label: "Minerador", icon: Search },
  { href: "/precificacao", label: "Precificacao", icon: Calculator },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/producao", label: "Producao", icon: Factory },
  { href: "/vendas", label: "Vendas", icon: ReceiptText },
  { href: "/pontos-de-venda", label: "Pontos de Venda", icon: MapPin },
  { href: "/bling", label: "Bling", icon: FileSpreadsheet },
  { href: "/estoque", label: "Estoque", icon: Layers3 },
  { href: "/filamentos", label: "Filamentos", icon: Shirt },
  { href: "/componentes", label: "Componentes", icon: Box },
  { href: "/impressoras", label: "Impressoras", icon: Printer },
  { href: "/movimentacoes", label: "Movimentacoes", icon: TableProperties },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r bg-sidebar px-3 py-4 lg:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Gauge className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Mimagi 3D</p>
          <p className="text-xs text-muted-foreground">Operacao e custos</p>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={cn(buttonVariants({ variant: "ghost" }), "h-10 w-full justify-start gap-2")}>
              <item.icon className="size-4" />
              {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 px-2">
        <ThemeToggle />
      </div>
      <form action={signOutAction} className="mt-2 px-2">
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </aside>
  );
}
