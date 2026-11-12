// Troca a senha do login de um barbeiro. Só o admin da barbearia do barbeiro pode, e
// nunca a de um admin (antes qualquer admin trocava a senha de qualquer usuário).
import { adminClient, corsHeaders, handleError, HttpError, json, requireAdminOfBarber } from "../_shared/barber-admin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = adminClient();
  try {
    const { barberId, newPassword } = await req.json();
    const { callerId, barber } = await requireAdminOfBarber(supabase, req, barberId);

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres.");
    }
    if (!barber.user_id) throw new HttpError(409, "Este barbeiro ainda não tem login. Use “Criar login”.");
    if (barber.user_id === callerId) {
      throw new HttpError(400, "Para trocar a sua própria senha, use “Esqueci minha senha” no login.");
    }

    // Quem é admin de alguma barbearia (ou da plataforma) só troca a própria senha.
    const [{ data: adminOf, error: adminError }, { data: platform, error: platformError }] = await Promise.all([
      supabase.from("barbershop_members").select("barbershop_id").eq("user_id", barber.user_id).eq("role", "admin").limit(1),
      supabase.from("platform_admins").select("user_id").eq("user_id", barber.user_id).limit(1),
    ]);
    if (adminError) throw adminError;
    if (platformError) throw platformError;
    if (adminOf?.length || platform?.length) {
      throw new HttpError(403, "Não é possível trocar a senha de um administrador por aqui.");
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(barber.user_id, { password: newPassword });
    if (updateError) throw updateError;

    return json({ success: true, message: "Senha redefinida." });
  } catch (error) {
    return handleError(error);
  }
});
