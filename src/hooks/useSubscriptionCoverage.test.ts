import { describe, expect, it } from "vitest";
import { evaluateCoverage, extraTotal, type SubscriptionCoverage } from "./useSubscriptionCoverage";

const corte = { id: "corte", name: "Corte", price: 50 };
const barba = { id: "barba", name: "Barba", price: 30 };
const sobrancelha = { id: "sobrancelha", name: "Sobrancelha", price: 15 };

function coverage(overrides: Partial<SubscriptionCoverage> = {}): SubscriptionCoverage {
  return {
    subscriptionId: "sub-1",
    cycleId: "cycle-1",
    planName: "Plano Teste",
    expired: false,
    generalLimit: null,
    generalUsed: 0,
    rules: [],
    usedByService: {},
    ...overrides,
  };
}

describe("evaluateCoverage", () => {
  it("sem assinatura, nada é coberto", () => {
    const lines = evaluateCoverage(null, [corte, barba]);
    expect(lines.map((l) => l.covered)).toEqual([false, false]);
    expect(lines.every((l) => l.reason === "no-subscription")).toBe(true);
  });

  it("assinatura com ciclo vencido não cobre nada", () => {
    const lines = evaluateCoverage(coverage({ expired: true }), [corte]);
    expect(lines[0]).toMatchObject({ covered: false, reason: "no-subscription" });
  });

  it("plano sem regras e sem limite cobre qualquer serviço", () => {
    const lines = evaluateCoverage(coverage(), [corte, barba, sobrancelha]);
    expect(lines.every((l) => l.covered)).toBe(true);
  });

  it("plano sem regras respeita o limite geral, inclusive dentro da mesma seleção", () => {
    const lines = evaluateCoverage(coverage({ generalLimit: 4, generalUsed: 3 }), [corte, barba]);
    expect(lines.map((l) => l.covered)).toEqual([true, false]);
    expect(lines[1]).toMatchObject({ reason: "limit-reached", used: 4, limit: 4 });
  });

  it("plano com regras: serviço fora do plano é pago à parte", () => {
    const lines = evaluateCoverage(
      coverage({ rules: [{ service_id: "corte", monthly_limit: null }] }),
      [corte, barba],
    );
    expect(lines[0].covered).toBe(true);
    expect(lines[1]).toMatchObject({ covered: false, reason: "not-included" });
  });

  it("plano com regras: respeita o limite mensal por serviço", () => {
    const lines = evaluateCoverage(
      coverage({
        rules: [{ service_id: "corte", monthly_limit: 2 }],
        usedByService: { corte: 1 },
      }),
      [corte, corte],
    );
    expect(lines.map((l) => l.covered)).toEqual([true, false]);
    expect(lines[1]).toMatchObject({ used: 2, limit: 2, reason: "limit-reached" });
  });

  it("plano com regras: o limite geral prevalece sobre o limite do serviço", () => {
    const lines = evaluateCoverage(
      coverage({
        generalLimit: 1,
        generalUsed: 1,
        rules: [{ service_id: "corte", monthly_limit: null }],
      }),
      [corte],
    );
    expect(lines[0]).toMatchObject({ covered: false, reason: "limit-reached" });
  });
});

describe("extraTotal", () => {
  it("soma só o que não é coberto", () => {
    const lines = evaluateCoverage(
      coverage({ rules: [{ service_id: "corte", monthly_limit: null }] }),
      [corte, barba, sobrancelha],
    );
    expect(extraTotal(lines)).toBe(45);
  });
});
