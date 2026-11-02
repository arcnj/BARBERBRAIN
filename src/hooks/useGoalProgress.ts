import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { monthYearInSaoPaulo } from "@/shared/lib/dates";
import { goalNotifications, type GoalSnapshot } from "@/features/metas/domain/goal-notifications";

type GoalType = Tables<"barber_goals">["goal_type"];

const goalTypeLabel = (type: GoalType, serviceName?: string | null, serviceCategory?: string | null): string => {
  if (type === "services" && serviceCategory) return `Categoria: ${serviceCategory}`;
  if (type === "services" && serviceName) return serviceName;
  const labels: Record<GoalType, string> = {
    cuts: "Cortes",
    revenue: "Faturamento",
    services: "Serviços",
    product_sales: "Vendas de Produtos",
  };
  return labels[type];
};

/** Metas do barbeiro no mês atual (fuso de SP), já calculadas pelo banco. */
export async function fetchBarberMonthGoals(barberId: string): Promise<GoalSnapshot[]> {
  const { month, year } = monthYearInSaoPaulo();
  const { data, error } = await supabase
    .from("barber_goals")
    .select("id, goal_type, target_value, current_value, reward_value, status, service_category, barber:barbers(name), service:services(name)")
    .eq("barber_id", barberId)
    .eq("month", month)
    .eq("year", year);
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    label: goalTypeLabel(g.goal_type, g.service?.name, g.service_category),
    barberName: g.barber?.name ?? null,
    targetValue: Number(g.target_value),
    currentValue: Number(g.current_value),
    rewardValue: Number(g.reward_value),
    status: g.status,
    isRevenue: g.goal_type === "revenue",
  }));
}

/**
 * Metas e premiações são calculadas pelo banco quando o atendimento é concluído
 * (gatilho on_order_completed). Aqui só lemos o resultado para avisar o usuário.
 */
export function useGoalProgress() {
  const queryClient = useQueryClient();

  /** Fotografa as metas dos barbeiros antes de concluir atendimentos. */
  const snapshotGoals = useCallback(async (barberIds: string[]) => {
    const snapshots = new Map<string, GoalSnapshot[]>();
    for (const id of new Set(barberIds)) {
      try {
        snapshots.set(id, await fetchBarberMonthGoals(id));
      } catch (err) {
        console.error("Erro ao ler metas antes do atendimento:", err);
      }
    }
    return snapshots;
  }, []);

  /**
   * Depois da conclusão: o banco já registrou comissões, metas e uso da assinatura.
   * Mostra os avisos de meta (comparando com a foto de antes) e atualiza as telas.
   */
  const afterOrdersCompleted = useCallback(
    async (snapshots: Map<string, GoalSnapshot[]>) => {
      for (const [barberId, before] of snapshots) {
        try {
          const after = await fetchBarberMonthGoals(barberId);
          for (const n of goalNotifications(before, after)) {
            if (n.kind === "completed") toast.success(n.message, { duration: 8000 });
            else toast.info(n.message, { duration: 6000 });
          }
        } catch (err) {
          console.error("Erro ao ler metas após o atendimento:", err);
        }
      }
      for (const key of [
        "barber-goals",
        "barber-financial-records",
        "subscriptions-overview",
        "subscription-quota",
        "subscription-coverage",
        "subscription-history",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    [queryClient],
  );

  /** Recalcula no banco as metas de um barbeiro em um mês (botão "Atualizar progresso"). */
  const recalculateGoals = useMutation({
    mutationFn: async ({ barberId, month, year }: { barberId: string; month: number; year: number }) => {
      const { data, error } = await supabase.rpc("recalculate_barber_goals", {
        p_barber_id: barberId,
        p_month: month,
        p_year: year,
      });
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barber-goals"] });
      queryClient.invalidateQueries({ queryKey: ["barber-financial-records"] });
    },
  });

  return { snapshotGoals, afterOrdersCompleted, recalculateGoals };
}
