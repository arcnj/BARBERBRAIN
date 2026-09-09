import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriberInfo {
  planName: string;
  price: number;
  benefits: string[];
  currentPeriodEnd: string;
  daysLeft: number;
  expiringSoon: boolean;
  expired: boolean;
}

/**
 * Mapa customer_id -> assinatura ativa, para exibir o selo de assinante
 * nas telas do barbeiro/admin (Agenda e Atendimentos de hoje).
 */
export function useSubscriptionStatus() {
  const { data } = useQuery({
    queryKey: ["active-subscriptions-map"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .select("customer_id, current_period_end, status, plan:subscription_plans(name, price, benefits)")
        .eq("status", "active");

      if (error) throw error;

      const map: Record<string, SubscriberInfo> = {};
      (data ?? []).forEach((row) => {
        const plan = row.plan as unknown as { name: string; price: number; benefits: string[] } | null;
        const daysLeft = differenceInCalendarDays(parseISO(row.current_period_end), new Date());
        const info: SubscriberInfo = {
          planName: plan?.name ?? "Assinatura",
          price: Number(plan?.price ?? 0),
          benefits: plan?.benefits ?? [],
          currentPeriodEnd: row.current_period_end,
          daysLeft,
          expiringSoon: daysLeft >= 0 && daysLeft <= 3,
          expired: daysLeft < 0,
        };
        const existing = map[row.customer_id];
        if (!existing || parseISO(row.current_period_end) > parseISO(existing.currentPeriodEnd)) {
          map[row.customer_id] = info;
        }
      });
      return map;
    },
  });

  return {
    subscribers: data ?? {},
    getSubscription: (customerId: string | null | undefined): SubscriberInfo | null =>
      (customerId && data?.[customerId]) || null,
  };
}
