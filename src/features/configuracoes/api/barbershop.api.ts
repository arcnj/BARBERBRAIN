import { supabase } from "@/integrations/supabase/client";

export interface MyBarbershop {
  id: string;
  name: string;
  slug: string;
}

/** Barbearia em que o usuário logado é admin (dono). */
export async function getMyAdminBarbershop(userId: string): Promise<MyBarbershop | null> {
  const { data, error } = await supabase
    .from("barbershop_members")
    .select("barbershop:barbershops(id, name, slug)")
    .eq("user_id", userId)
    .eq("role", "admin")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.barbershop ?? null;
}

export class SlugInUseError extends Error {
  constructor() {
    super("Esse endereço já está em uso por outra barbearia");
  }
}

export async function updateBarbershopSlug(barbershopId: string, slug: string): Promise<MyBarbershop> {
  const { data, error } = await supabase
    .from("barbershops")
    .update({ slug })
    .eq("id", barbershopId)
    .select("id, name, slug")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") throw new SlugInUseError();
    throw error;
  }
  // RLS ignora em silêncio quem não pode alterar: sem linha devolvida = sem permissão
  if (!data) throw new Error("Você não tem permissão para alterar o link desta barbearia");
  return data;
}
