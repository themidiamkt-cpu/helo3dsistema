"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  "/dashboard",
  "/minerador",
  "/precificacao",
  "/produtos",
  "/producao",
  "/vendas",
  "/pontos-de-venda",
  "/bling",
  "/estoque",
  "/filamentos",
  "/componentes",
  "/impressoras",
  "/movimentacoes",
  "/configuracoes",
];

export function MobileNav() {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 lg:hidden">
      <span className="text-sm font-semibold">Mimagi 3D</span>
      <Sheet>
        <SheetTrigger render={<Button size="icon" variant="outline" aria-label="Abrir menu" />}>
          <Menu className="size-4" />
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 grid gap-2">
            {links.map((href) => (
              <Link key={href} href={href} className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}>
                {href.slice(1).replace("-", " ")}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
