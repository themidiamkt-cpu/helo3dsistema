"use client";

import { useActionState, useMemo, useState } from "react";
import { createSaleAction } from "@/actions/records";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateChannelFee, type SalesChannel } from "@/lib/sales/channels";
import { formatCurrency } from "@/lib/formatters";
import type { Product } from "@/types/database";

const initialState = { ok: false, message: "" };
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function productPrice(product: Product | undefined) {
  return product ? Number(product.manual_sale_price ?? product.calculated_sale_price) || 0 : 0;
}

export function SaleForm({ products, channels }: { products: Product[]; channels: SalesChannel[] }) {
  const [state, formAction, pending] = useActionState(async (_: typeof initialState, formData: FormData) => createSaleAction(formData), initialState);
  const [saleType, setSaleType] = useState<"sale" | "own_use">("sale");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState(() => productPrice(products[0]).toFixed(2));
  const [discount, setDiscount] = useState("0");
  const [shipping, setShipping] = useState("0");

  const selectedProduct = products.find((product) => product.id === productId);
  const selectedChannel = channels.find((channel) => channel.id === channelId);
  const summary = useMemo(() => {
    if (saleType === "own_use") return { subtotal: 0, fee: 0, total: 0 };
    const subtotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);
    const fee = selectedChannel ? calculateChannelFee(subtotal, selectedChannel) : 0;
    const total = subtotal + (Number(shipping) || 0) - (Number(discount) || 0) - fee;
    return { subtotal, fee, total };
  }, [discount, quantity, saleType, selectedChannel, shipping, unitPrice]);

  function handleProductChange(nextProductId: string) {
    setProductId(nextProductId);
    setUnitPrice(saleType === "own_use" ? "0" : productPrice(products.find((product) => product.id === nextProductId)).toFixed(2));
  }

  return (
    <form action={formAction} className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <ActionToast state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="sale_type">Tipo</Label>
          <select
            id="sale_type"
            name="sale_type"
            value={saleType}
            onChange={(event) => {
              const nextType = event.target.value as "sale" | "own_use";
              setSaleType(nextType);
              if (nextType === "own_use") {
                setUnitPrice("0");
                setDiscount("0");
                setShipping("0");
              } else {
                setUnitPrice(productPrice(selectedProduct).toFixed(2));
              }
            }}
            className={selectClassName}
          >
            <option value="sale">Venda</option>
            <option value="own_use">Uso proprio</option>
          </select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="product_id">Produto</Label>
          <select id="product_id" name="product_id" value={productId} onChange={(event) => handleProductChange(event.target.value)} className={selectClassName} required>
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - estoque {product.finished_stock_quantity}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="channel_id">Canal</Label>
          <select id="channel_id" name="channel_id" value={channelId} onChange={(event) => setChannelId(event.target.value)} className={selectClassName} disabled={saleType === "own_use"} required={saleType === "sale"}>
            <option value="">{saleType === "own_use" ? "Sem canal" : "Cadastre um canal"}</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer_name">Cliente</Label>
          <Input id="customer_name" name="customer_name" placeholder={saleType === "own_use" ? "Uso proprio" : "Nome do cliente"} disabled={saleType === "own_use"} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="quantity">Quantidade</Label>
          <Input id="quantity" name="quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit_price">Preco unitario</Label>
          <Input id="unit_price" name="unit_price" type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} readOnly={saleType === "own_use"} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="discount">Desconto</Label>
          <Input id="discount" name="discount" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} readOnly={saleType === "own_use"} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="shipping">Frete cobrado</Label>
          <Input id="shipping" name="shipping" type="number" min="0" step="0.01" value={shipping} onChange={(event) => setShipping(event.target.value)} readOnly={saleType === "own_use"} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="notes">Observacoes</Label>
          <Textarea id="notes" name="notes" />
        </div>
      </div>
      <div className="rounded-md border p-3">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Estoque</span>
            <strong>{selectedProduct?.finished_stock_quantity ?? 0} un.</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Subtotal</span>
            <strong>{formatCurrency(summary.subtotal)}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Taxa canal</span>
            <strong>{formatCurrency(summary.fee)}</strong>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-muted-foreground">Liquido</span>
            <strong>{formatCurrency(summary.total)}</strong>
          </div>
        </div>
        <Button type="submit" disabled={pending || !products.length || (saleType === "sale" && !channels.length)} className="mt-4 w-full">
          {pending ? "Lancando..." : saleType === "own_use" ? "Baixar para uso proprio" : "Lancar venda"}
        </Button>
      </div>
    </form>
  );
}
