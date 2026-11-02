import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizeBRPhone } from "./whatsapp";

describe("normalizeBRPhone", () => {
  it("adiciona o 55 em celular e fixo", () => {
    expect(normalizeBRPhone("(67) 99103-7379")).toBe("5567991037379");
    expect(normalizeBRPhone("6733334444")).toBe("556733334444");
  });
  it("mantém número que já tem DDI", () => {
    expect(normalizeBRPhone("+55 67 99103-7379")).toBe("5567991037379");
  });
  it("vazio vira null", () => {
    expect(normalizeBRPhone("")).toBeNull();
    expect(normalizeBRPhone(null)).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("com telefone", () => {
    expect(buildWhatsAppUrl("67991037379", "Olá!")).toBe("https://wa.me/5567991037379?text=Ol%C3%A1!");
  });
  it("sem telefone, para compartilhar", () => {
    expect(buildWhatsAppUrl(null, "a b")).toBe("https://wa.me/?text=a%20b");
  });
});
