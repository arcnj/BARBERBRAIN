import { describe, expect, it } from "vitest";
import { groupServicesByCategory, parseBarbershopPublic } from "./barbershop-public";

const payload = {
  id: "shop-1",
  name: "Barbearia do Zé",
  slug: "barbearia-do-ze",
  logo_url: null,
  address: "Rua A, 1",
  services: [
    { id: "s1", name: "Corte", description: null, category: "Cabelo", price: "50.00", duration_minutes: 30 },
    { id: "s2", name: "Barba", description: "Toalha quente", category: "Barba", price: 35, duration_minutes: 30 },
    { id: "s3", name: "Pigmentação", description: null, category: "Cabelo", price: 60, duration_minutes: null },
  ],
  barbers: [{ id: "b1", name: "João", avatar_url: null }],
};

describe("parseBarbershopPublic", () => {
  it("converte o JSON da RPC (preço numeric vem como texto)", () => {
    const shop = parseBarbershopPublic(payload);
    expect(shop?.name).toBe("Barbearia do Zé");
    expect(shop?.services[0].price).toBe(50);
    expect(shop?.barbers).toHaveLength(1);
  });

  it("null ou sem id devolve null", () => {
    expect(parseBarbershopPublic(null)).toBeNull();
    expect(parseBarbershopPublic({ name: "x" })).toBeNull();
  });
});

describe("groupServicesByCategory", () => {
  it("agrupa mantendo a ordem", () => {
    const shop = parseBarbershopPublic(payload)!;
    const groups = groupServicesByCategory(shop.services);
    expect(groups.map(([cat]) => cat)).toEqual(["Cabelo", "Barba"]);
    expect(groups[0][1].map((s) => s.name)).toEqual(["Corte", "Pigmentação"]);
  });
});
