"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/actions/auth";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { ok: false, message: "" };

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <ActionToast state={state} />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Informe seu e-mail para receber as instrucoes.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <Button disabled={pending}>{pending ? "Enviando..." : "Enviar recuperacao"}</Button>
            <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
              Voltar para login
            </Link>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

