import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const JOB_NAME = "subscription_reminders";
const BATCH_LIMIT = 40;
const LOCK_MINUTES = 10;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if (digits.startsWith("55")) return `+${digits}`;
  return `+${digits}`;
}

function renderTemplate(
  template: string,
  vars: { nome: string; plano: string; data: string; valor: string },
) {
  return template
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{plano}", vars.plano)
    .replaceAll("{data}", vars.data)
    .replaceAll("{valor}", vars.valor);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ---- authorization: scheduled job token OR signed-in admin -------------
  let authorized = false;
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader) {
    const { data: tokenRow } = await supabase
      .from("cron_tokens")
      .select("token")
      .eq("name", JOB_NAME)
      .maybeSingle();
    authorized = !!tokenRow?.token && tokenRow.token === cronHeader;
  } else {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      if (userData?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userData.user.id,
          _role: "admin",
        });
        authorized = isAdmin === true;
      }
    }
  }
  if (!authorized) return json({ error: "Não autorizado" }, 401);

  try {
    // ---- settings + pause guard ------------------------------------------
    const { data: settings } = await supabase
      .from("subscription_reminder_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!settings) return json({ error: "Configuração de avisos não encontrada" }, 400);
    if (!settings.enabled) return json({ skipped: "avisos desativados", sent: 0 });
    if (settings.paused_reason) {
      return json({ paused: settings.paused_reason, sent: 0 });
    }

    // ---- single-flight lock ----------------------------------------------
    const now = new Date();
    const lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString();
    const { data: existingLock } = await supabase
      .from("job_locks")
      .select("locked_until")
      .eq("job_name", JOB_NAME)
      .maybeSingle();

    if (existingLock && new Date(existingLock.locked_until) > now) {
      return json({ skipped: "execução já em andamento", sent: 0 });
    }
    await supabase
      .from("job_locks")
      .upsert({ job_name: JOB_NAME, locked_until: lockUntil, locked_at: now.toISOString() });

    // ---- due subscriptions ----------------------------------------------
    const target = new Date(now.getTime() + (settings.days_before ?? 3) * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const { data: due, error: dueError } = await supabase
      .from("customer_subscriptions")
      .select(
        "id, customer_id, current_period_end, plan:subscription_plans(name, price)",
      )
      .eq("status", "active")
      .eq("auto_reminder", true)
      .eq("current_period_end", target)
      .limit(BATCH_LIMIT);

    if (dueError) throw dueError;
    if (!due?.length) {
      await supabase.from("job_locks").upsert({
        job_name: JOB_NAME,
        locked_until: now.toISOString(),
        locked_at: now.toISOString(),
      });
      return json({ sent: 0, failed: 0, skipped: 0, target });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", due.map((s) => s.customer_id));
    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const twilioKey = Deno.env.get("TWILIO_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const fromNumber = Deno.env.get("TWILIO_WHATSAPP_FROM");

    let sent = 0, failed = 0, skipped = 0;
    let pausedReason: string | null = null;

    for (const sub of due) {
      // idempotent claim: unique (subscription_id, period_end, channel)
      const { data: claimed, error: claimError } = await supabase
        .from("subscription_reminders")
        .insert({
          subscription_id: sub.id,
          period_end: sub.current_period_end,
          channel: "whatsapp",
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (claimError || !claimed) continue; // already handled this cycle

      const profile = profileMap.get(sub.customer_id);
      const plan = (sub as { plan?: { name?: string; price?: number } }).plan;
      const phone = formatPhone(profile?.phone ?? null);
      const message = renderTemplate(settings.message_template ?? "", {
        nome: (profile?.full_name ?? "cliente").split(" ")[0],
        plano: plan?.name ?? "assinatura",
        data: sub.current_period_end.split("-").reverse().join("/"),
        valor: `R$ ${Number(plan?.price ?? 0).toFixed(2).replace(".", ",")}`,
      });

      const markSkipped = async (reason: string) => {
        skipped++;
        await supabase
          .from("subscription_reminders")
          .update({ status: "skipped", error: reason, message })
          .eq("id", claimed.id);
      };

      if (!phone) {
        await markSkipped("Cliente sem telefone cadastrado");
        continue;
      }
      if (!twilioKey || !lovableKey || !fromNumber) {
        await markSkipped("WhatsApp automático ainda não configurado");
        continue;
      }

      try {
        const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": twilioKey,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: `whatsapp:${phone}`,
            From: `whatsapp:${fromNumber}`,
            ...(settings.twilio_template_sid
              ? {
                ContentSid: settings.twilio_template_sid,
                ContentVariables: JSON.stringify({ "1": message }),
              }
              : { Body: message }),
          }),
        });

        const bodyText = await response.text();

        if (!response.ok) {
          console.error(`Twilio falhou [${response.status}]: ${bodyText}`);
          failed++;
          await supabase
            .from("subscription_reminders")
            .update({
              status: "failed",
              error: `[${response.status}] ${bodyText.slice(0, 500)}`,
              message,
            })
            .eq("id", claimed.id);

          // circuit breaker
          if ([401, 402, 403].includes(response.status)) {
            pausedReason = `Envio pausado: provedor retornou ${response.status}. Verifique a conexão/saldo do WhatsApp.`;
            break;
          }
          continue;
        }

        let providerId: string | null = null;
        try {
          providerId = JSON.parse(bodyText)?.sid ?? null;
        } catch (_) { /* ignore */ }

        sent++;
        await supabase
          .from("subscription_reminders")
          .update({
            status: "sent",
            provider_message_id: providerId,
            message,
            sent_at: new Date().toISOString(),
          })
          .eq("id", claimed.id);
      } catch (err) {
        console.error("Erro ao enviar aviso:", err);
        failed++;
        await supabase
          .from("subscription_reminders")
          .update({ status: "failed", error: String(err).slice(0, 500), message })
          .eq("id", claimed.id);
      }
    }

    if (pausedReason) {
      await supabase
        .from("subscription_reminder_settings")
        .update({ paused_reason: pausedReason, paused_at: new Date().toISOString() })
        .eq("id", settings.id);
    }

    // release lock
    await supabase.from("job_locks").upsert({
      job_name: JOB_NAME,
      locked_until: new Date().toISOString(),
      locked_at: new Date().toISOString(),
    });

    return json({ target, sent, failed, skipped, paused: pausedReason });
  } catch (err) {
    console.error("send-subscription-reminders:", err);
    return json({ error: String(err) }, 500);
  }
});
