import { describe, expect, it } from "vitest";
import { monthYearInSaoPaulo, saoPauloToISO, todayInSaoPaulo } from "./dates";

describe("datas no fuso de São Paulo", () => {
  it("23h em SP do dia 31/10 ainda é outubro (em UTC já é novembro)", () => {
    const d = new Date("2026-11-01T02:00:00Z"); // 31/10 23:00 em SP
    expect(monthYearInSaoPaulo(d)).toEqual({ month: 10, year: 2026 });
    expect(todayInSaoPaulo(d)).toBe("2026-10-31");
  });
  it("meio-dia é o mesmo dia nos dois fusos", () => {
    const d = new Date("2026-11-15T15:00:00Z");
    expect(todayInSaoPaulo(d)).toBe("2026-11-15");
  });
});

describe("saoPauloToISO", () => {
  it("10h em São Paulo é 13h UTC", () => {
    expect(saoPauloToISO("2026-11-16", "10:00")).toBe("2026-11-16T13:00:00.000Z");
  });
  it("22h30 em São Paulo já é o dia seguinte em UTC", () => {
    expect(saoPauloToISO("2026-11-16", "22:30")).toBe("2026-11-17T01:30:00.000Z");
  });
});
