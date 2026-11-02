import { describe, expect, it } from "vitest";
import { translateAuthError } from "./auth-errors";

const err = (message: string) => ({ message });

describe("translateAuthError", () => {
  it("mantém as traduções que já existiam", () => {
    expect(translateAuthError(err("Invalid login credentials"), "Erro")).toBe("Email ou senha incorretos");
    expect(translateAuthError(err("Email not confirmed"), "Erro")).toBe("Confirme seu email antes de fazer login");
    expect(translateAuthError(err("User already registered"), "Erro")).toBe("Este email já está cadastrado");
  });

  it("explica chave de API inválida", () => {
    expect(translateAuthError(err("Invalid API key"), "Erro")).toMatch(/chave da API/);
  });

  it("mostra o tamanho mínimo da senha", () => {
    expect(translateAuthError(err("Password should be at least 8 characters."), "Erro")).toBe(
      "A senha precisa ter pelo menos 8 caracteres",
    );
  });

  it("traduz falha de rede", () => {
    expect(translateAuthError(new TypeError("Failed to fetch"), "Erro")).toMatch(/conectar ao servidor/);
  });

  it("erro desconhecido mostra o texto original", () => {
    expect(translateAuthError(err("Something odd"), "Erro ao criar conta")).toBe("Erro ao criar conta: Something odd");
  });

  it("sem mensagem, usa o fallback", () => {
    expect(translateAuthError(null, "Erro ao criar conta")).toBe("Erro ao criar conta");
  });
});
