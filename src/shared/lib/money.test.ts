import { describe, expect, it } from "vitest";
import { formatBRL } from "./money";

// Intl usa espaço não separável entre "R$" e o número
const clean = (s: string) => s.replace(/\s/g, " ");

describe("formatBRL", () => {
  it("formata em reais", () => {
    expect(clean(formatBRL(50))).toBe("R$ 50,00");
    expect(clean(formatBRL(1234.5))).toBe("R$ 1.234,50");
  });
  it("aceita numeric do banco como texto e trata vazio", () => {
    expect(clean(formatBRL("35.9"))).toBe("R$ 35,90");
    expect(clean(formatBRL(null))).toBe("R$ 0,00");
  });
});
