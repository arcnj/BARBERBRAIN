import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GoalType = "cuts" | "revenue" | "services" | "product_sales";
type GoalStatus = "active" | "completed" | "expired";

interface BarberGoal {
  id: string;
  barber_id: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  reward_value: number;
  month: number;
  year: number;
  status: GoalStatus;
  completed_at: string | null;
  service_id?: string | null;
  barber?: { name: string } | null;
  service?: { name: string } | null;
}

const getGoalTypeLabel = (type: GoalType, serviceName?: string): string => {
  if (type === "services" && serviceName) {
    return serviceName;
  }
  const labels: Record<GoalType, string> = {
    cuts: "Cortes",
    revenue: "Faturamento",
    services: "Serviços",
    product_sales: "Vendas de Produtos",
  };
  return labels[type];
};

export function useGoalProgress() {
  const queryClient = useQueryClient();

  // Calculate goal progress from real data
  const calculateGoalProgress = async (
    barberId: string,
    goalType: GoalType,
    month: number,
    year: number,
    serviceId?: string | null
  ) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    let value = 0;

    if (goalType === "cuts") {
      // Count ALL completed orders (all services count as cuts, including combos)
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("barber_id", barberId)
        .eq("status", "completed")
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString());

      value = data?.length || 0;
    } else if (goalType === "revenue") {
      // Sum total revenue
      const { data } = await supabase
        .from("orders")
        .select("total_price")
        .eq("barber_id", barberId)
        .eq("status", "completed")
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString());

      value = data?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    } else if (goalType === "services") {
      // Count specific service completions
      if (serviceId) {
        const { data } = await supabase
          .from("order_items")
          .select(`
            id,
            order:orders!inner(barber_id, status, scheduled_at)
          `)
          .eq("service_id", serviceId)
          .eq("order.barber_id", barberId)
          .eq("order.status", "completed")
          .gte("order.scheduled_at", startDate.toISOString())
          .lte("order.scheduled_at", endDate.toISOString());

        value = data?.length || 0;
      } else {
        // Generic service count (all services)
        const { data } = await supabase
          .from("orders")
          .select("id")
          .eq("barber_id", barberId)
          .eq("status", "completed")
          .gte("scheduled_at", startDate.toISOString())
          .lte("scheduled_at", endDate.toISOString());

        value = data?.length || 0;
      }
    } else if (goalType === "product_sales") {
      // Count product sales
      const { data } = await supabase
        .from("orders")
        .select(`
          id,
          order_products(quantity)
        `)
        .eq("barber_id", barberId)
        .eq("status", "completed")
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString());

      value =
        data?.reduce(
          (sum, o) =>
            sum +
            (o.order_products?.reduce(
              (s: number, p: any) => s + (p.quantity || 0),
              0
            ) || 0),
          0
        ) || 0;
    }

    return value;
  };

  // Update a single goal's progress
  const updateSingleGoal = async (goal: BarberGoal) => {
    const currentValue = await calculateGoalProgress(
      goal.barber_id,
      goal.goal_type,
      goal.month,
      goal.year,
      goal.service_id
    );

    const isCompleted = currentValue >= goal.target_value;
    const newStatus: GoalStatus = isCompleted ? "completed" : goal.status;
    const progressPercent = (currentValue / goal.target_value) * 100;
    const previousProgressPercent = (goal.current_value / goal.target_value) * 100;

    const { error } = await supabase
      .from("barber_goals")
      .update({
        current_value: currentValue,
        status: newStatus,
        completed_at:
          isCompleted && !goal.completed_at
            ? new Date().toISOString()
            : goal.completed_at,
      })
      .eq("id", goal.id);

    if (error) throw error;

    // If goal is completed and wasn't before, create financial record
    if (isCompleted && goal.status !== "completed" && goal.reward_value > 0) {
      const { error: recordError } = await supabase
        .from("barber_financial_records")
        .insert({
          barber_id: goal.barber_id,
          record_type: "goal_reward",
          amount: goal.reward_value,
          reference_id: goal.id,
          description: `Premiação por meta atingida - ${getGoalTypeLabel(goal.goal_type)}`,
          month: goal.month,
          year: goal.year,
        });

      if (recordError) console.error("Error creating financial record:", recordError);
    }

    return {
      currentValue,
      isCompleted,
      progressPercent,
      previousProgressPercent,
      barberName: goal.barber?.name,
      goalType: goal.goal_type,
      serviceName: goal.service?.name,
      targetValue: goal.target_value,
      rewardValue: goal.reward_value,
    };
  };

  // Update all active goals for a specific barber
  const updateBarberGoals = useMutation({
    mutationFn: async (barberId: string) => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get all active goals for this barber in current month
      const { data: goals, error } = await supabase
        .from("barber_goals")
        .select(`
          *,
          barber:barbers(name),
          service:services(name)
        `)
        .eq("barber_id", barberId)
        .eq("status", "active")
        .eq("month", currentMonth)
        .eq("year", currentYear);

      if (error) throw error;
      if (!goals?.length) return [];

      const results = [];
      for (const goal of goals) {
        const result = await updateSingleGoal(goal as BarberGoal);
        results.push(result);
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["barber-goals"] });

      // Show notifications for significant progress
      results.forEach((data) => {
        const goalLabel = getGoalTypeLabel(data.goalType, data.serviceName);
        
        if (data.progressPercent >= 80 && data.previousProgressPercent < 80 && !data.isCompleted) {
          toast.info(
            `🔥 ${data.barberName || "Barbeiro"} está a ${Math.round(100 - data.progressPercent)}% de atingir a meta de ${goalLabel}!`,
            { duration: 6000 }
          );
        }

        if (data.isCompleted && data.previousProgressPercent < 100) {
          toast.success(
            `🏆 ${data.barberName || "Barbeiro"} completou a meta de ${goalLabel} e ganhou R$ ${data.rewardValue.toFixed(0)}!`,
            { duration: 8000 }
          );
        }
      });
    },
  });

  return {
    updateBarberGoals,
    calculateGoalProgress,
  };
}
