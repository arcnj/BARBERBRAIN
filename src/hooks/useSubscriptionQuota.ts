import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionQuota {
  planName: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  blocked: boolean;
  periodStart: string;
  periodEnd: string;
  expired: boolean;
}

/**
 * Consumo do ciclo vigente da assinatura, calculado pelos registros de
 * utilização (subscription_usages) — não por contagem de agendamentos.
 * Plano sem limite (monthly_visit_limit null) nunca bloqueia.
 */
export function useSubscriptionQuota(userId: string | undefined) {
  return useQuery({
    queryKey: ["subscription-quota", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<SubscriptionQuota | null> => {
      const { data: sub, error } = await supabase
        .from("customer_subscriptions")
        .select(
          "id, current_period_end, status, plan:subscription_plans(name, monthly_visit_limit)"
        )
        .eq("customer_id", userId!)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!sub) return null;

      const plan = sub.plan as unknown as {
        name: string;
        monthly_visit_limit: number | null;
      } | null;

      const { data: cycle, error: cycleError } = await supabase
        .from("subscription_cycles")
        .select("id, period_start, period_end")
        .eq("subscription_id", sub.id)
        .eq("status", "current")
        .maybeSingle();
      if (cycleError) throw cycleError;

      const limit = plan?.monthly_visit_limit ?? null;

      if (!cycle) {
        // Sem ciclo vigente: assinatura precisa de renovação confirmada.
        return {
          planName: plan?.name ?? "Assinatura",
          limit,
          used: 0,
          remaining: limit,
          blocked: true,
          periodStart: sub.current_period_end,
          periodEnd: sub.current_period_end,
          expired: true,
        };
      }

      const { count, error: countError } = await supabase
        .from("subscription_usages")
        .select("id", { count: "exact", head: true })
        .eq("cycle_id", cycle.id)
        .eq("status", "active");
      if (countError) throw countError;

      const used = count ?? 0;
      const today = new Date().toISOString().slice(0, 10);
      const expired = today > cycle.period_end;

      return {
        planName: plan?.name ?? "Assinatura",
        limit,
        used,
        remaining: limit == null ? null : Math.max(0, limit - used),
        blocked: expired || (limit != null && used >= limit),
        periodStart: cycle.period_start,
        periodEnd: cycle.period_end,
        expired,
      };
    },
  });
}
