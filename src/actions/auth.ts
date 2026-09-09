"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, resetPasswordSchema, signUpSchema } from "@/lib/validations/schemas";

export type ActionState = { ok: boolean; message: string };

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: `Nao foi possivel entrar: ${error.message}` };

  redirect("/dashboard");
}

export async function signUpAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    organization_name: formData.get("organization_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Dados invalidos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
        organization_name: parsed.data.organization_name,
      },
    },
  });

  if (error) return { ok: false, message: `Nao foi possivel cadastrar: ${error.message}` };

  return { ok: true, message: "Cadastro criado. Se o Supabase pedir confirmacao, confira seu e-mail antes de entrar." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "E-mail invalido." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);
  if (error) return { ok: false, message: "Nao foi possivel enviar a recuperacao." };
  return { ok: true, message: "Enviamos as instrucoes para o seu e-mail." };
}
