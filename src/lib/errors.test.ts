import { describe, expect, it } from "vitest";
import { getDbErrorMessage } from "./errors";

describe("getDbErrorMessage", () => {
  it("troca o bloqueio de permissão do banco por aviso em português", () => {
    const err = { code: "42501", message: 'new row violates row-level security policy for table "orders"' };
    expect(getDbErrorMessage(err, "padrão")).toBe("Você não tem permissão para fazer isso.");
  });

  it("mostra as mensagens das nossas regras do banco", () => {
    const err = { code: "42501", message: "Você só pode alterar o status deste atendimento." };
    expect(getDbErrorMessage(err, "padrão")).toBe("Você só pode alterar o status deste atendimento.");
  });

  it("usa o texto padrão para erro técnico desconhecido", () => {
    expect(getDbErrorMessage({ code: "08006", message: "connection failure" }, "padrão")).toBe("padrão");
    expect(getDbErrorMessage(null, "padrão")).toBe("padrão");
  });

  it("mostra mensagens de Error criadas pelo próprio app", () => {
    expect(getDbErrorMessage(new Error("Sem permissão para alterar este atendimento."), "padrão")).toBe(
      "Sem permissão para alterar este atendimento.",
    );
  });
});
