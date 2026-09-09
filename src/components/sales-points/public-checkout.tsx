"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/formatters";

type CheckoutResult = {
  saleId: string;
  amount: number;
  qrCodeImage: string;
  copyPaste: string;
  expiresAt: string;
  simulated: boolean;
};

export function PublicCheckout({ token, price, available }: { token: string; price: number; available: number }) {
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const total = useMemo(() => Math.round(price * quantity * 100) / 100, [price, quantity]);

  function checkout(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/pdv/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          quantity,
          customer_name: formData.get("customer_name"),
          customer_phone: formData.get("customer_phone"),
          customer_email: formData.get("customer_email"),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Nao foi possivel criar o Pix.");
        return;
      }
      setResult(payload);
    });
  }

  if (result) {
    return (
      <div className="grid gap-4 rounded-lg border bg-background p-4">
        <div>
          <p className="text-sm text-muted-foreground">Valor do Pix</p>
          <p className="text-3xl font-semibold">{formatCurrency(result.amount)}</p>
        </div>
        {result.simulated ? <p className="rounded-md bg-muted px-3 py-2 text-sm">Pix simulado: configure ASAAS_API_KEY para cobrar de verdade.</p> : null}
        <img src={result.qrCodeImage} alt="QR Code Pix" className="mx-auto size-64 rounded-md border bg-white p-3" />
        <div className="grid gap-2">
          <Label>Pix copia e cola</Label>
          <Textarea value={result.copyPaste} readOnly className="min-h-24" />
          <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(result.copyPaste)}>
            <Copy className="size-4" /> Copiar Pix
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={checkout} className="grid gap-4 rounded-lg border bg-background p-4">
      <div className="grid gap-2">
        <Label htmlFor="quantity">Quantidade</Label>
        <Input id="quantity" type="number" min={1} max={available} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(available, Number(event.target.value) || 1)))} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="customer_name">Nome</Label>
          <Input id="customer_name" name="customer_name" placeholder="Opcional" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customer_phone">WhatsApp</Label>
          <Input id="customer_phone" name="customer_phone" placeholder="Opcional" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="customer_email">Email</Label>
        <Input id="customer_email" name="customer_email" type="email" placeholder="Opcional" />
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <strong>{formatCurrency(total)}</strong>
      </div>
      {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || available <= 0}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Comprar com Pix
      </Button>
    </form>
  );
}
