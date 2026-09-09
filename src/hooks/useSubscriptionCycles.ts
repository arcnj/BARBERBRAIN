import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SubscriptionUiStatus = "active" | "pending" | "overdue" | "cancelled" | "paused";

export interface SubscriptionPlanInfo {
  id: string;
  name: string;
  price: number;
  benefits: string[];
  monthly_visit_limit: number | null;
}

export interface SubscriptionCycle {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  payment_id: string | null;
  created_at: string;
}

export interface SubscriptionPayment {
  id: string;
  amount: number;
  expected_amount: number | null;
  paid_at: string;
  method: string | null;
  payment_method: string | null;
  status: string | null;
  notes: string | null;
  cycle_id: string | null;
  confirmed_at: string | null;
}

export interface SubscriptionUsage {
  id: string;
  cycle_id: string;
  order_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  used_at: string;
  status: string;
  reversal_reason: string | null;
  reversed_at: string | null;
}

export interface SubscriptionRow {
  id: string;
  customer_id: string;
  plan_id: string;
  start_date: string;
  current_period_end: string;
  status: string;
  auto_reminder: boolean;
  plan: SubscriptionPlanInfo | null;
  customerName: string;
  customerPhone: string | null;
  cycle: SubscriptionCycle | null;
  usedCount: number;
  limit: number | null;
  remaining: number | null;
  lastPayment: SubscriptionPayment | null;
  cyclePaid: boolean;
  daysToDue: number;
  uiStatus: SubscriptionUiStatus;
}

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Cartão de crédito" },
  { value: "debit", label: "Cartão de débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

export function paymentMethodLabel(value: string | null | undefined) {
  if (!value) return "—";
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export const statusLabels: Record<SubscriptionUiStatus, string> = {
  active: "ATIVO",
  pending: "PENDENTE",
  overdue: "VENCIDO",
  cancelled: "CANCELADO",
  paused: "PAUSADO",
};

export const statusClasses: Record<SubscriptionUiStatus, string> = {
  active: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  overdue: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  paused: "bg-muted text-muted-foreground border-border",
};

/**
 * Visão consolidada das assinaturas: plano, ciclo vigente, utilizações
 * registradas no ciclo e último pagamento confirmado.
 */
export function useSubscriptionsOverview() {
  const query = useQuery({
    queryKey: ["subscriptions-overview"],
    staleTime: 15_000,
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data: subs, error } = await supabase
        .from("customer_subscriptions")
        .select(
          "id, customer_id, plan_id, start_date, current_period_end, status, auto_reminder, plan:subscription_plans(id, name, price, benefits, monthly_visit_limit)"
        )
        .order("current_period_end");
      if (error) throw error;
      const list = subs ?? [];
      if (!list.length) return [];

      const ids = list.map((s) => s.id);
      const customerIds = Array.from(new Set(list.map((s) => s.customer_id)));

      const [cyclesRes, paymentsRes, profilesRes] = await Promise.all([
        supabase
          .from("subscription_cycles")
          .select("id, subscription_id, period_start, period_end, status, payment_id, created_at")
          .in("subscription_id", ids)
          .order("period_end", { ascending: false }),
        supabase
          .from("subscription_payments")
          .select(
            "id, subscription_id, amount, expected_amount, paid_at, method, payment_method, status, notes, cycle_id, confirmed_at"
          )
          .in("subscription_id", ids)
          .order("paid_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, phone").in("user_id", customerIds),
      ]);

      if (cyclesRes.error) throw cyclesRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const cycles = cyclesRes.data ?? [];
      const currentCycleIds = cycles.filter((c) => c.status === "current").map((c) => c.id);

      let usages: { cycle_id: string; status: string }[] = [];
      if (currentCycleIds.length) {
        const { data, error: usageError } = await supabase
          .from("subscription_usages")
          .select("cycle_id, status")
          .in("cycle_id", currentCycleIds)
          .eq("status", "active");
        if (usageError) throw usageError;
        usages = data ?? [];
      }

      const usageByCycle = new Map<string, number>();
      usages.forEach((u) => usageByCycle.set(u.cycle_id, (usageByCycle.get(u.cycle_id) ?? 0) + 1));

      const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));

      return list.map((sub) => {
        const plan = (sub.plan as unknown as SubscriptionPlanInfo | null) ?? null;
        const cycle =
          (cycles.find((c) => c.subscription_id === sub.id && c.status === "current") as
            | SubscriptionCycle
            | undefined) ?? null;
        const payments = paymentsRes.data!.filter((p) => p.subscription_id === sub.id);
        const lastPayment = (payments[0] as unknown as SubscriptionPayment) ?? null;
        const usedCount = cycle ? usageByCycle.get(cycle.id) ?? 0 : 0;
        const limit = plan?.monthly_visit_limit ?? null;
        const daysToDue = differenceInCalendarDays(parseISO(sub.current_period_end), new Date());
        const cyclePaid = !!cycle && payments.some((p) => p.cycle_id === cycle.id);

        let uiStatus: SubscriptionUiStatus;
        if (sub.status === "cancelled") uiStatus = "cancelled";
        else if (sub.status === "paused") uiStatus = "paused";
        else if (daysToDue < 0) uiStatus = "overdue";
        else if (daysToDue <= 7) uiStatus = "pending";
        else uiStatus = "active";

        const profile = profileMap.get(sub.customer_id);

        return {
          id: sub.id,
          customer_id: sub.customer_id,
          plan_id: sub.plan_id,
          start_date: sub.start_date,
          current_period_end: sub.current_period_end,
          status: sub.status,
          auto_reminder: sub.auto_reminder,
          plan,
          customerName: profile?.full_name || "Cliente",
          customerPhone: profile?.phone ?? null,
          cycle,
          usedCount,
          limit,
          remaining: limit == null ? null : Math.max(0, limit - usedCount),
          lastPayment,
          cyclePaid,
          daysToDue,
          uiStatus,
        };
      });
    },
  });

  const metrics = useMemo(() => {
    const rows = query.data ?? [];
    return {
      active: rows.filter((r) => r.uiStatus === "active").length,
      pending: rows.filter((r) => r.uiStatus === "pending").length,
      overdue: rows.filter((r) => r.uiStatus === "overdue").length,
    };
  }, [query.data]);

  return { ...query, rows: query.data ?? [], metrics };
}

/** Total recebido no mês corrente (pagamentos confirmados). */
export function useMonthlyReceived() {
  return useQuery({
    queryKey: ["subscription-received-month"],
    staleTime: 30_000,
    queryFn: async () => {
      const from = startOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("amount")
        .eq("status", "confirmed")
        .gte("paid_at", from);
      if (error) throw error;
      return (data ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    },
  });
}

/** Função central de negócio (mesma usada por um webhook futuro). */
export function useConfirmSubscriptionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      subscriptionId: string;
      amount: number;
      paidAt: string;
      method: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("confirm_subscription_payment", {
        p_subscription_id: input.subscriptionId,
        p_amount: input.amount,
        p_paid_at: input.paidAt,
        p_method: input.method,
        p_notes: input.notes || null,
      });
      if (error) throw error;
      return data as unknown as SubscriptionCycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-received-month"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
      queryClient.invalidateQueries({ queryKey: ["active-subscriptions-map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReverseUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { usageId: string; reason?: string }) => {
      const { error } = await supabase.rpc("reverse_subscription_usage", {
        p_usage_id: input.usageId,
        p_reason: input.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Utilização estornada e saldo devolvido.");
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-history"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-quota"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSubscriptionStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("customer_subscriptions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["active-subscriptions-map"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface HistoryEvent {
  id: string;
  at: string;
  kind: "payment" | "usage" | "reversal" | "cycle";
  title: string;
  detail?: string;
  usageId?: string;
  reversible?: boolean;
}

/** Linha do tempo completa de uma assinatura (pagamentos, ciclos e utilizações). */
export function useSubscriptionHistory(subscriptionId: string | undefined) {
  return useQuery({
    queryKey: ["subscription-history", subscriptionId],
    enabled: !!subscriptionId,
    queryFn: async (): Promise<{
      events: HistoryEvent[];
      payments: SubscriptionPayment[];
      usages: SubscriptionUsage[];
      cycles: SubscriptionCycle[];
    }> => {
      const [paymentsRes, cyclesRes, usagesRes] = await Promise.all([
        supabase
          .from("subscription_payments")
          .select(
            "id, amount, expected_amount, paid_at, method, payment_method, status, notes, cycle_id, confirmed_at"
          )
          .eq("subscription_id", subscriptionId!)
          .order("paid_at", { ascending: false }),
        supabase
          .from("subscription_cycles")
          .select("id, period_start, period_end, status, payment_id, created_at")
          .eq("subscription_id", subscriptionId!)
          .order("period_end", { ascending: false }),
        supabase
          .from("subscription_usages")
          .select(
            "id, cycle_id, order_id, service_id, barber_id, used_at, status, reversal_reason, reversed_at, services(name), barbers(name)"
          )
          .eq("subscription_id", subscriptionId!)
          .order("used_at", { ascending: false }),
      ]);

      if (paymentsRes.error) throw paymentsRes.error;
      if (cyclesRes.error) throw cyclesRes.error;
      if (usagesRes.error) throw usagesRes.error;

      const payments = (paymentsRes.data ?? []) as unknown as SubscriptionPayment[];
      const cycles = (cyclesRes.data ?? []) as unknown as SubscriptionCycle[];
      const usages = (usagesRes.data ?? []) as unknown as (SubscriptionUsage & {
        services: { name: string } | null;
        barbers: { name: string } | null;
      })[];

      const events: HistoryEvent[] = [];

      payments.forEach((p) => {
        events.push({
          id: `pay-${p.id}`,
          at: p.paid_at,
          kind: "payment",
          title: `Pagamento confirmado · R$ ${Number(p.amount).toFixed(2)}`,
          detail: paymentMethodLabel(p.payment_method || p.method),
        });
      });

      cycles.forEach((c) => {
        events.push({
          id: `cycle-${c.id}`,
          at: c.created_at,
          kind: "cycle",
          title: "Novo ciclo iniciado",
          detail: `${c.period_start} → ${c.period_end}`,
        });
      });

      usages.forEach((u) => {
        events.push({
          id: `use-${u.id}`,
          at: u.used_at,
          kind: u.status === "reversed" ? "reversal" : "usage",
          title:
            u.status === "reversed"
              ? `Utilização estornada${u.services?.name ? ` · ${u.services.name}` : ""}`
              : `${u.services?.name ?? "Serviço"} utilizado`,
          detail: [
            u.barbers?.name ? `Profissional: ${u.barbers.name}` : null,
            u.reversal_reason ? `Motivo: ${u.reversal_reason}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          usageId: u.id,
          reversible: u.status === "active",
        });
      });

      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      return { events, payments, usages, cycles };
    },
  });
}
