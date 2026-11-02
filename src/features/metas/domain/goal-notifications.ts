export interface GoalSnapshot {
  id: string;
  label: string;
  barberName: string | null;
  targetValue: number;
  currentValue: number;
  rewardValue: number;
  status: "active" | "completed" | "expired";
  isRevenue: boolean;
}

export interface GoalNotification {
  kind: "near" | "completed";
  message: string;
}

const pct = (g: GoalSnapshot) => (g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0);

/**
 * Avisos de metas comparando antes e depois de um atendimento concluído:
 * "quase lá" ao cruzar 80% e "atingida" quando a meta passa a concluída.
 */
export function goalNotifications(before: GoalSnapshot[], after: GoalSnapshot[]): GoalNotification[] {
  const previous = new Map(before.map((g) => [g.id, g]));
  const result: GoalNotification[] = [];

  for (const goal of after) {
    const old = previous.get(goal.id);
    if (!old) continue;
    const who = goal.barberName || "Barbeiro";

    if (goal.status === "completed" && old.status !== "completed") {
      result.push({
        kind: "completed",
        message: `🏆 ${who} completou a meta de ${goal.label} e ganhou R$ ${goal.rewardValue.toFixed(0)}!`,
      });
    } else if (goal.status === "active" && pct(goal) >= 80 && pct(old) < 80) {
      const missing = Math.max(0, Math.round(goal.targetValue - goal.currentValue));
      result.push({
        kind: "near",
        message: `🔥 ${who} está a ${Math.round(100 - pct(goal))}% de atingir a meta de ${goal.label}! Faltam ${missing} ${goal.isRevenue ? "reais" : "unidades"}.`,
      });
    }
  }
  return result;
}
