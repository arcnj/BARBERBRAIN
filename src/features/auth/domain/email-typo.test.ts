import { describe, expect, it } from "vitest";
import { suggestEmailFix } from "./email-typo";

describe("suggestEmailFix", () => {
  it.each([
    ["guilherme@gmail.ocm", "guilherme@gmail.com"],
    ["joao@gmial.com", "joao@gmail.com"],
    ["ana@hotmal.com", "ana@hotmail.com"],
    ["ana@gmail.con", "ana@gmail.com"],
    ["Bia@Outlok.com", "bia@outlook.com"],
    ["carlos@yahoo.com.bt", "carlos@yahoo.com.br"],
  ])("%s → %s", (typed, expected) => {
    expect(suggestEmailFix(typed)).toBe(expected);
  });

  it.each(["guilherme@gmail.com", "ana@hotmail.com.br", "dono@minhabarbearia.com.br", "x@empresa.io", "sem-arroba", ""])(
    "não sugere nada para %s",
    (typed) => {
      expect(suggestEmailFix(typed)).toBeNull();
    },
  );
});
