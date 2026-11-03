import { supabase } from "@/integrations/supabase/client";

/** Envia o e-mail com o link para criar uma nova senha. */
export async function requestPasswordReset(email: string, barbershopSlug?: string): Promise<void> {
  const params = barbershopSlug ? `?b=${encodeURIComponent(barbershopSlug)}` : "";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/redefinir-senha${params}`,
  });
  if (error) throw error;
}

/** Grava a nova senha do usuário que chegou pelo link do e-mail. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
