import { describe, expect, it } from "vitest";
import { slugify, validateSlug } from "./slug";

describe("slugify", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(slugify("Barbearia do Zé!")).toBe("barbearia-do-ze");
    expect(slugify("  --Corte & Barba  2  ")).toBe("corte-barba-2");
  });
  it("limita o tamanho sem terminar em hífen", () => {
    const slug = slugify("a".repeat(59) + " bbb");
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("validateSlug", () => {
  it("aceita slug válido", () => {
    expect(validateSlug("barbearia-do-ze")).toBeNull();
  });
  it("recusa curto, maiúsculas e hífen nas pontas", () => {
    expect(validateSlug("ab")).toMatch(/pelo menos 3/);
    expect(validateSlug("Barbearia")).toMatch(/minúsculas/);
    expect(validateSlug("-barbearia")).toMatch(/hífen/);
  });
});
