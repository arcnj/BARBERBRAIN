import { supabase } from "@/integrations/supabase/client";

export interface MemberBarbershop {
  id: string;
  name: string;
  slug: string;
}

/** Barbearias em que o usuário logado é membro (cliente ou equipe), mais antigas primeiro. */
export async function listMyBarbershops(userId: string): Promise<MemberBarbershop[]> {
  const { data, error } = await supabase
    .from("barbershop_members")
    .select("created_at, barbershop:barbershops(id, name, slug)")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).flatMap((row) => (row.barbershop ? [row.barbershop] : []));
}
