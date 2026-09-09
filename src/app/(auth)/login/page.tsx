"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/actions/auth";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, { ok: false, message: "" });

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <ActionToast state={state} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse sua operacao de impressao 3D.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
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
