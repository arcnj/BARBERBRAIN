import { supabase } from "@/integrations/supabase/client";
import { parseBarbershopPublic, type BarbershopPublic } from "../domain/barbershop-public";

export async function getBarbershopPublic(slug: string): Promise<BarbershopPublic | null> {
  const { data, error } = await supabase.rpc("get_barbershop_public", { p_slug: slug });
  if (error) throw error;
  return parseBarbershopPublic(data);
}

/** O usuário logado vira cliente da barbearia do link (idempotente). Devolve o id da barbearia. */
export async function joinBarbershop(slug: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_barbershop", { p_slug: slug });
  if (error) throw error;
  return data;
}
