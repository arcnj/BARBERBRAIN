import { supabase } from "@/integrations/supabase/client";

/**
 * Ids dos clientes das barbearias em que o usuário logado é da equipe (admin ou barbeiro).
 * Quem cria conta pelo link da barbearia entra aqui na hora (barbershop_members).
 */
export async function fetchShopCustomerIds(): Promise<string[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data: staffOf, error: staffError } = await supabase
    .from("barbershop_members")
    .select("barbershop_id")
    .eq("user_id", user.id)
    .in("role", ["admin", "barber"]);
  if (staffError) throw staffError;
  const shopIds = (staffOf ?? []).map((m) => m.barbershop_id);
  if (shopIds.length === 0) return [];

  const { data: customers, error } = await supabase
    .from("barbershop_members")
    .select("user_id")
    .eq("role", "customer")
    .in("barbershop_id", shopIds);
  if (error) throw error;
  return [...new Set((customers ?? []).map((m) => m.user_id))];
}
