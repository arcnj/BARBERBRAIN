import { describe, expect, it } from "vitest";
import { pickCurrentBarbershop } from "./pick-barbershop";

const a = { id: "1", slug: "barbearia-a" };
const b = { id: "2", slug: "barbearia-b" };

describe("pickCurrentBarbershop", () => {
  it("sem barbearias devolve null", () => {
    expect(pickCurrentBarbershop([], "barbearia-a")).toBeNull();
  });
  it("usa a preferida quando o usuário pertence a ela", () => {
    expect(pickCurrentBarbershop([a, b], "barbearia-b")).toBe(b);
  });
  it("preferida desconhecida ou ausente cai na primeira", () => {
    expect(pickCurrentBarbershop([a, b], "outra")).toBe(a);
    expect(pickCurrentBarbershop([a, b], null)).toBe(a);
  });
});
