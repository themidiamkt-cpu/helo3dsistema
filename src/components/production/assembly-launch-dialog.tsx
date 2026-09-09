"use client";

import { PackagePlus } from "lucide-react";
import { AssemblyForm } from "@/components/production/assembly-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { InventorySupply, Product, ProductSupply } from "@/types/database";

export function AssemblyLaunchDialog({
  products,
  supplies,
  productSupplies,
}: {
  products: Product[];
  supplies: InventorySupply[];
  productSupplies: ProductSupply[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <PackagePlus className="size-4" />
        Lancar estoque acabado
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Lancar estoque acabado</DialogTitle>
          <DialogDescription>
            Monte o produto final consumindo partes impressas e componentes cadastrados.
          </DialogDescription>
        </DialogHeader>
        <AssemblyForm products={products} supplies={supplies} productSupplies={productSupplies} />
      </DialogContent>
    </Dialog>
  );
}
