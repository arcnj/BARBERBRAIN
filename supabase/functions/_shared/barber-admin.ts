// Apoio das edge functions de barbeiros: autenticação e "admin desta barbearia".
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface BarberRecord {
  id: string;
  barbershop_id: string;
  user_id: string | null;
  name: string;
  active: boolean | null;
}

/**
 * Confere quem chamou e devolve o cadastro do barbeiro, desde que quem chamou seja
 * admin da barbearia DESTE barbeiro (não basta ser admin de qualquer barbearia).
 */
export async function requireAdminOfBarber(
  supabase: SupabaseClient,
  req: Request,
  barberId: unknown,
): Promise<{ callerId: string; barber: BarberRecord }> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new HttpError(401, "Entre na sua conta para continuar.");

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user) throw new HttpError(401, "Sua sessão expirou. Entre de novo.");

  if (typeof barberId !== "string" || !barberId) throw new HttpError(400, "Barbeiro não informado.");

  const { data: barber, error: barberError } = await supabase
    .from("barbers")
    .select("id, barbershop_id, user_id, name, active")
    .eq("id", barberId)
    .maybeSingle();
  if (barberError) throw barberError;
  if (!barber) throw new HttpError(404, "Barbeiro não encontrado.");

  const { data: membership, error: memberError } = await supabase
    .from("barbershop_members")
    .select("role")
    .eq("barbershop_id", barber.barbershop_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (memberError) throw memberError;
  if (membership?.role !== "admin") {
    throw new HttpError(403, "Só o dono desta barbearia pode fazer isso.");
  }

  return { callerId: auth.user.id, barber: barber as BarberRecord };
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error("Erro inesperado:", error);
  return json({ error: "Erro interno do servidor. Tente de novo em instantes." }, 500);
}
