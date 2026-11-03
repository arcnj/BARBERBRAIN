/** Mensagem legível de um erro desconhecido (Error, AuthError, PostgrestError ou outro objeto com `message`). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return fallback;
}

const PERMISSION_DENIED = /row-level security|permission denied/i;
// Códigos usados pelas mensagens em português que o próprio banco levanta (raise exception).
const OWN_DB_MESSAGE_CODES = new Set(["P0001", "42501", "23514"]);

/**
 * Mensagem para o usuário a partir de um erro do banco: bloqueio de permissão vira um
 * aviso em português; mensagens levantadas pelas nossas regras passam como estão; o resto
 * usa o texto padrão (nada de inglês técnico na tela).
 */
export function getDbErrorMessage(err: unknown, fallback: string): string {
  const message = getErrorMessage(err, "");
  if (!message) return fallback;
  if (PERMISSION_DENIED.test(message)) return "Você não tem permissão para fazer isso.";
  const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
  if (OWN_DB_MESSAGE_CODES.has(code) || err instanceof Error) return message;
  return fallback;
}
