// Cria o login de um barbeiro já cadastrado, na barbearia do cadastro.
// Só o admin daquela barbearia pode chamar.
import { adminClient, corsHeaders, handleError, HttpError, json, requireAdminOfBarber } from "../_shared/barber-admin.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = adminClient();
  let createdUserId: string | null = null;

  try {
    const { email, password, name, phone, barberId } = await req.json();
    const { barber } = await requireAdminOfBarber(supabase, req, barberId);

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!EMAIL.test(cleanEmail)) throw new HttpError(400, "Informe um e-mail válido.");
    if (typeof password !== "string" || password.length < 6) {
      throw new HttpError(400, "A senha precisa ter pelo menos 6 caracteres.");
    }
    if (barber.user_id) throw new HttpError(409, "Este barbeiro já tem login. Use “Redefinir senha”.");
    if (barber.active === false) throw new HttpError(409, "Reative o barbeiro antes de criar o login.");

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name || barber.name, phone: phone || null },
    });
    if (createError || !created.user) {
      const msg = createError?.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new HttpError(409, "Já existe uma conta com este e-mail. Use outro e-mail para o barbeiro.");
      }
      throw createError ?? new Error("Usuário não criado");
    }
    createdUserId = created.user.id;

    // Barbeiro desta barbearia (e só desta)
    const { error: memberError } = await supabase
      .from("barbershop_members")
      .upsert(
        { barbershop_id: barber.barbershop_id, user_id: createdUserId, role: "barber" },
        { onConflict: "barbershop_id,user_id" },
      );
    if (memberError) throw memberError;

    const { error: roleError } = await supabase.from("user_roles").update({ role: "barber" }).eq("user_id", createdUserId);
    if (roleError) throw roleError;

    const { data: linked, error: linkError } = await supabase
      .from("barbers")
      .update({ user_id: createdUserId, email: cleanEmail })
      .eq("id", barber.id)
      .is("user_id", null)
      .select("id");
    if (linkError) throw linkError;
    if (!linked?.length) throw new HttpError(409, "Este barbeiro acabou de ganhar um login. Atualize a página.");

    return json({ success: true, userId: createdUserId, message: "Login do barbeiro criado." });
  } catch (error) {
    // Nada pela metade: se algo falhou depois de criar o usuário, ele é removido.
    if (createdUserId) {
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(createdUserId);
      if (cleanupError) console.error("Falha ao desfazer usuário criado:", cleanupError);
    }
    return handleError(error);
  }
});
