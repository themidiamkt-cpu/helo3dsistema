"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Tempo esgotado ao tentar entrar. Recarregue e tente novamente.")), 15000);
    });

    try {
      const formData = new FormData(event.currentTarget);
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const response = await Promise.race([
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
        timeout,
      ]);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(result.error ?? "Nao foi possivel entrar.");
        return;
      }

      toast.success("Login realizado.");
      window.location.assign("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua operacao de impressao 3D.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Entrando..." : "Entrar"}
            </Button>
            <Link href="/cadastro" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
              Criar primeira conta
            </Link>
            <Link href="/recuperar-senha" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
              Recuperar senha
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
