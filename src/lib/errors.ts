/** Mensagem legível de um erro desconhecido (Error, AuthError, PostgrestError ou outro objeto com `message`). */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message;
  }
  return fallback;
}
