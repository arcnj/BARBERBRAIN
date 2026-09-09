import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubscriptionRequest {
  id: string;
  customer_id: string;
  plan_id: string;
  subscription_id: string | null;
  kind: "new" | "renewal";
  status: "pending" | "approved" | "rejected";
  payment_id: string | null;
  decided_at: string | null;
  created_at: string;
  planName: string;
  planPrice: number;
  customerName: string;
  customerPhone: string | null;
  paidAmount: number | null;
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["subscription-requests"] });
  queryClient.invalidateQueries({ queryKey: ["my-subscription-request"] });
  queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
  queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
  queryClient.invalidateQueries({ queryKey: ["subscription-received-month"] });
  queryClient.invalidateQueries({ queryKey: ["subscription-quota"] });
  queryClient.invalidateQueries({ queryKey: ["active-subscriptions-map"] });
}

/** Lista de pedidos de assinatura (para o admin). */
export function useSubscriptionRequests() {
  return useQuery({
    queryKey: ["subscription-requests"],
    staleTime: 15_000,
    queryFn: async (): Promise<SubscriptionRequest[]> => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select(
          "id, customer_id, plan_id, subscription_id, kind, status, payment_id, decided_at, created_at, plan:subscription_plans(name, price), payment:subscription_payments(amount)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const rows = data ?? [];
      const customerIds = Array.from(new Set(rows.map((r) => r.customer_id)));
      const profiles = customerIds.length
        ? (
            await supabase
              .from("profiles")
              .select("user_id, full_name, phone")
              .in("user_id", customerIds)
          ).data ?? []
        : [];
      const map = new Map(profiles.map((p) => [p.user_id, p]));

      return rows.map((r) => {
        const plan = r.plan as unknown as { name: string; price: number } | null;
        const payment = r.payment as unknown as { amount: number } | null;
        const profile = map.get(r.customer_id);
        return {
          id: r.id,
          customer_id: r.customer_id,
          plan_id: r.plan_id,
          subscription_id: r.subscription_id,
          kind: r.kind as "new" | "renewal",
          status: r.status as SubscriptionRequest["status"],
          payment_id: r.payment_id,
          decided_at: r.decided_at,
          created_at: r.created_at,
          planName: plan?.name ?? "Plano",
          planPrice: Number(plan?.price ?? 0),
          customerName: profile?.full_name || "Cliente",
          customerPhone: profile?.phone ?? null,
          paidAmount: payment ? Number(payment.amount) : null,
        };
      });
    },
  });
}

export function useApproveSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      requestId: string;
      amount: number;
      paidAt: string;
      method: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("approve_subscription_request", {
        p_request_id: input.requestId,
        p_amount: input.amount,
        p_paid_at: input.paidAt,
        p_method: input.method,
        p_notes: input.notes || null,
      });
      if (error) throw error;
      return data as unknown as { period_start: string; period_end: string };
    },
    onSuccess: () => invalidateAll(queryClient),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectSubscriptionRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.rpc("reject_subscription_request", {
        p_request_id: requestId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido recusado.");
      invalidateAll(queryClient);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Pedido pendente do próprio cliente. */
export function useMySubscriptionRequest(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["my-subscription-request", userId],
    enabled: !!userId,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("id, plan_id, kind, status, created_at, plan:subscription_plans(name, price)")
        .eq("customer_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createRequest = useMutation({
    mutationFn: async (input: {
      planId: string;
      kind: "new" | "renewal";
      subscriptionId?: string | null;
    }) => {
      const { error } = await supabase.from("subscription_requests").insert({
        customer_id: userId!,
        plan_id: input.planId,
        kind: input.kind,
        subscription_id: input.subscriptionId ?? null,
      });
      // pedido pendente já existente: não é erro para o cliente
      if (error && !error.message.includes("subscription_requests_one_pending_per_customer")) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscription-request", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { pendingRequest: query.data ?? null, isLoading: query.isLoading, createRequest };
}
