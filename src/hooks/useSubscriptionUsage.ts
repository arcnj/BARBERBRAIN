import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecordUsageInput {
  orderId: string;
  customerId: string;
  barberId: string | null;
  usedAt?: string;
}

/**
 * Registra as utilizações da assinatura ao concluir um atendimento.
 * Cada serviço do atendimento gera um registro próprio no ciclo vigente.
 * Nunca bloqueia a conclusão do atendimento: se não houver assinatura,
 * ciclo vigente ou saldo, simplesmente nada é registrado.
 */
export function useSubscriptionUsage() {
  const queryClient = useQueryClient();

  const recordUsage = useMutation({
    mutationFn: async ({ orderId, customerId, barberId, usedAt }: RecordUsageInput) => {
      // assinatura ativa do cliente
      const { data: sub } = await supabase
        .from("customer_subscriptions")
        .select("id, plan:subscription_plans(monthly_visit_limit)")
        .eq("customer_id", customerId)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) return { recorded: 0 };

      // ciclo vigente
      const { data: cycle } = await supabase
        .from("subscription_cycles")
        .select("id, period_start, period_end")
        .eq("subscription_id", sub.id)
        .eq("status", "current")
        .maybeSingle();
      if (!cycle) return { recorded: 0 };

      const today = new Date().toISOString().slice(0, 10);
      if (today > cycle.period_end) return { recorded: 0 };

      const limit =
        (sub.plan as unknown as { monthly_visit_limit: number | null } | null)
          ?.monthly_visit_limit ?? null;

      const { count } = await supabase
        .from("subscription_usages")
        .select("id", { count: "exact", head: true })
        .eq("cycle_id", cycle.id)
        .eq("status", "active");
      const used = count ?? 0;

      const { data: items } = await supabase
        .from("order_items")
        .select("service_id")
        .eq("order_id", orderId);

      const services = (items ?? []).map((i) => i.service_id).filter(Boolean) as string[];
      if (!services.length) return { recorded: 0 };

      const allowed =
        limit == null ? services : services.slice(0, Math.max(0, limit - used));
      if (!allowed.length) return { recorded: 0 };

      const rows = allowed.map((serviceId) => ({
        subscription_id: sub.id,
        cycle_id: cycle.id,
        customer_id: customerId,
        order_id: orderId,
        service_id: serviceId,
        barber_id: barberId,
        used_at: usedAt || new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("subscription_usages")
        .upsert(rows, {
          onConflict: "cycle_id,order_id,service_id",
          ignoreDuplicates: true,
        });
      if (error) throw error;

      return { recorded: rows.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-quota"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
    },
  });

  return { recordUsage };
}
