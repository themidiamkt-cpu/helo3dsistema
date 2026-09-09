import { redirect } from "next/navigation";
import { hasSupabaseBrowserEnv } from "./env";
import { createClient } from "./server";

export async function requireUser() {
  if (!hasSupabaseBrowserEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function getCurrentProfile() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw new Error(error.message);
  return { supabase, user, profile: data };
}
