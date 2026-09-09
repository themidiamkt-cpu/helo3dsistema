"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("full_name") ?? "");
    const organizationName = String(formData.get("organization_name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          organization_name: organizationName,
        },
      },
    });

    setPending(false);

    if (error) {
      toast.error(`Nao foi possivel cadastrar: ${error.message}`);
      return;
    }

    toast.success("Cadastro criado. Confira seu e-mail se a confirmacao estiver ativa.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Criar conta</CardTitle>
          <CardDescription>Crie o primeiro acesso e a organizacao da empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Nome</Label>
              <Input id="full_name" name="full_name" autoComplete="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="organization_name">Empresa</Label>
              <Input id="organization_name" name="organization_name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar conta"}
            </Button>
            <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
              Ja tenho conta
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
