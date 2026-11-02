import { describe, expect, it } from "vitest";
import { goalNotifications, type GoalSnapshot } from "./goal-notifications";

const goal = (overrides: Partial<GoalSnapshot>): GoalSnapshot => ({
  id: "g1",
  label: "Cortes",
  barberName: "João",
  targetValue: 10,
  currentValue: 0,
  rewardValue: 100,
  status: "active",
  isRevenue: false,
  ...overrides,
});

describe("goalNotifications", () => {
  it("avisa ao cruzar 80%", () => {
    const n = goalNotifications([goal({ currentValue: 7 })], [goal({ currentValue: 8 })]);
    expect(n).toHaveLength(1);
    expect(n[0].kind).toBe("near");
    expect(n[0].message).toContain("Faltam 2 unidades");
  });

  it("avisa quando a meta é atingida", () => {
    const n = goalNotifications([goal({ currentValue: 9 })], [goal({ currentValue: 10, status: "completed" })]);
    expect(n).toEqual([{ kind: "completed", message: "🏆 João completou a meta de Cortes e ganhou R$ 100!" }]);
  });

  it("não repete aviso de meta já concluída nem quando já passava de 80%", () => {
    expect(goalNotifications([goal({ status: "completed" })], [goal({ status: "completed" })])).toEqual([]);
    expect(goalNotifications([goal({ currentValue: 8 })], [goal({ currentValue: 9 })])).toEqual([]);
  });
});
