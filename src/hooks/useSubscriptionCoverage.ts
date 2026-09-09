import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanServiceRule {
  service_id: string;
  monthly_limit: number | null;
}

export interface SubscriptionCoverage {
  subscriptionId: string;
  cycleId: string | null;
  planName: string;
  expired: boolean;
  /** limite geral de atendimentos do plano (null = ilimitado) */
  generalLimit: number | null;
  generalUsed: number;
  /** regras por serviço; vazio = plano sem serviços cadastrados (usa limite geral) */
  rules: PlanServiceRule[];
  /** usos ativos no ciclo, por service_id */
  usedByService: Record<string, number>;
}

export interface ServiceInput {
  id: string;
  name: string;
  price: number;
}

export interface CoverageLine extends ServiceInput {
  covered: boolean;
  limit: number | null;
  used: number;
  /** motivo quando não coberto */
  reason: "not-included" | "limit-reached" | "no-subscription" | null;
}

/**
 * Cobertura da assinatura do cliente: quais serviços estão inclusos no plano
 * e quanto já foi usado no ciclo vigente.
 */
export function useSubscriptionCoverage(userId: string | undefined) {
  return useQuery({
    queryKey: ["subscription-coverage", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<SubscriptionCoverage | null> => {
      const { data: sub } = await supabase
        .from("customer_subscriptions")
        .select("id, plan_id, plan:subscription_plans(name, monthly_visit_limit)")
        .eq("customer_id", userId!)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) return null;

      const plan = sub.plan as unknown as {
        name: string;
        monthly_visit_limit: number | null;
      } | null;

      const [{ data: cycle }, { data: planServices }] = await Promise.all([
        supabase
          .from("subscription_cycles")
          .select("id, period_end")
          .eq("subscription_id", sub.id)
          .eq("status", "current")
          .maybeSingle(),
        supabase
          .from("subscription_plan_services")
          .select("service_id, monthly_limit")
          .eq("plan_id", sub.plan_id),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      const expired = !cycle || today > cycle.period_end;

      const usedByService: Record<string, number> = {};
      let generalUsed = 0;

      if (cycle) {
        const { data: usages } = await supabase
          .from("subscription_usages")
          .select("service_id")
          .eq("cycle_id", cycle.id)
          .eq("status", "active")
          .eq("covered", true);
        for (const u of usages ?? []) {
          generalUsed += 1;
          if (u.service_id) {
            usedByService[u.service_id] = (usedByService[u.service_id] ?? 0) + 1;
          }
        }
      }

      return {
        subscriptionId: sub.id,
        cycleId: cycle?.id ?? null,
        planName: plan?.name ?? "Assinatura",
        expired,
        generalLimit: plan?.monthly_visit_limit ?? null,
        generalUsed,
        rules: (planServices ?? []) as PlanServiceRule[],
        usedByService,
      };
    },
  });
}

/**
 * Avalia uma lista de serviços escolhidos contra a cobertura da assinatura.
 * Serviços fora do plano ou acima da quantidade do mês são pagos à parte.
 */
export function evaluateCoverage(
  coverage: SubscriptionCoverage | null | undefined,
  servicesList: ServiceInput[],
): CoverageLine[] {
  if (!coverage || coverage.expired) {
    return servicesList.map((s) => ({
      ...s,
      covered: false,
      limit: null,
      used: 0,
      reason: "no-subscription" as const,
    }));
  }

  const hasRules = coverage.rules.length > 0;
  // consumo acumulado dentro desta própria seleção
  const pending: Record<string, number> = {};
  let pendingGeneral = 0;

  return servicesList.map((s) => {
    if (hasRules) {
      const rule = coverage.rules.find((r) => r.service_id === s.id);
      if (!rule) {
        return { ...s, covered: false, limit: null, used: 0, reason: "not-included" as const };
      }
      const used = (coverage.usedByService[s.id] ?? 0) + (pending[s.id] ?? 0);
      const withinService = rule.monthly_limit == null || used < rule.monthly_limit;
      const generalUsed = coverage.generalUsed + pendingGeneral;
      const withinGeneral =
        coverage.generalLimit == null || generalUsed < coverage.generalLimit;
      const covered = withinService && withinGeneral;
      if (covered) {
        pending[s.id] = (pending[s.id] ?? 0) + 1;
        pendingGeneral += 1;
      }
      return {
        ...s,
        covered,
        limit: rule.monthly_limit,
        used,
        reason: covered ? null : ("limit-reached" as const),
      };
    }

    // plano sem serviços cadastrados: vale o limite geral para qualquer serviço
    const generalUsed = coverage.generalUsed + pendingGeneral;
    const covered = coverage.generalLimit == null || generalUsed < coverage.generalLimit;
    if (covered) pendingGeneral += 1;
    return {
      ...s,
      covered,
      limit: coverage.generalLimit,
      used: generalUsed,
      reason: covered ? null : ("limit-reached" as const),
    };
  });
}

export function extraTotal(lines: CoverageLine[]) {
  return lines.filter((l) => !l.covered).reduce((sum, l) => sum + Number(l.price || 0), 0);
}
