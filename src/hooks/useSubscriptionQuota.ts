import { useQuery } from "@tanstack/react-query";
import { parseISO, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionQuota {
  planName: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  blocked: boolean;
  periodStart: string;
  periodEnd: string;
}

/**
 * Consumo de cortes do ciclo atual da assinatura do cliente.
 * Se o plano não tiver limite (monthly_visit_limit null), nunca bloqueia.
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

      const periodEnd = parseISO(sub.current_period_end);
      const periodStart = subMonths(periodEnd, 1);

      const { count, error: countError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", userId!)
        .neq("status", "cancelled")
        .gte("scheduled_at", periodStart.toISOString())
        .lte("scheduled_at", periodEnd.toISOString());

      if (countError) throw countError;

      const limit = plan?.monthly_visit_limit ?? null;
      const used = count ?? 0;

      return {
        planName: plan?.name ?? "Assinatura",
        limit,
        used,
        remaining: limit == null ? null : Math.max(0, limit - used),
        blocked: limit != null && used >= limit,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    },
  });
}
