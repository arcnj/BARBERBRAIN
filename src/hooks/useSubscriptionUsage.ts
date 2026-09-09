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
 * Cada serviço do atendimento gera um registro próprio no ciclo vigente,
 * marcado como coberto (dentro do plano) ou não coberto (pago à parte).
 * Nunca bloqueia a conclusão do atendimento.
 */
export function useSubscriptionUsage() {
  const queryClient = useQueryClient();

  const recordUsage = useMutation({
    mutationFn: async ({ orderId, customerId, barberId, usedAt }: RecordUsageInput) => {
      // assinatura ativa do cliente
      const { data: sub } = await supabase
        .from("customer_subscriptions")
        .select("id, plan_id, plan:subscription_plans(monthly_visit_limit)")
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

      const generalLimit =
        (sub.plan as unknown as { monthly_visit_limit: number | null } | null)
          ?.monthly_visit_limit ?? null;

      const [{ data: rules }, { data: usages }, { data: items }] = await Promise.all([
        supabase
          .from("subscription_plan_services")
          .select("service_id, monthly_limit")
          .eq("plan_id", sub.plan_id),
        supabase
          .from("subscription_usages")
          .select("service_id")
          .eq("cycle_id", cycle.id)
          .eq("status", "active")
          .eq("covered", true),
        supabase.from("order_items").select("service_id").eq("order_id", orderId),
      ]);

      const services = (items ?? []).map((i) => i.service_id).filter(Boolean) as string[];
      if (!services.length) return { recorded: 0 };

      const usedByService: Record<string, number> = {};
      let generalUsed = 0;
      for (const u of usages ?? []) {
        generalUsed += 1;
        if (u.service_id) usedByService[u.service_id] = (usedByService[u.service_id] ?? 0) + 1;
      }

      const hasRules = (rules ?? []).length > 0;

      const rows = services.map((serviceId) => {
        let covered: boolean;
        if (hasRules) {
          const rule = (rules ?? []).find((r) => r.service_id === serviceId);
          const withinService =
            !!rule && (rule.monthly_limit == null || (usedByService[serviceId] ?? 0) < rule.monthly_limit);
          const withinGeneral = generalLimit == null || generalUsed < generalLimit;
          covered = withinService && withinGeneral;
        } else {
          covered = generalLimit == null || generalUsed < generalLimit;
        }
        if (covered) {
          usedByService[serviceId] = (usedByService[serviceId] ?? 0) + 1;
          generalUsed += 1;
        }
        return {
          subscription_id: sub.id,
          cycle_id: cycle.id,
          customer_id: customerId,
          order_id: orderId,
          service_id: serviceId,
          barber_id: barberId,
          used_at: usedAt || new Date().toISOString(),
          covered,
        };
      });

      const { error } = await supabase
        .from("subscription_usages")
        .upsert(rows, {
          onConflict: "cycle_id,order_id,service_id",
          ignoreDuplicates: true,
        });
      if (error) throw error;

      return { recorded: rows.filter((r) => r.covered).length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-quota"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
    },
  });

  return { recordUsage };
}
