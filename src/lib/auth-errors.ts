/**
 * Traduz o erro do Supabase Auth para uma mensagem em português.
 * Erros desconhecidos mostram o texto original junto do fallback, para não esconder a causa.
 */
export function translateAuthError(err: unknown, fallback: string): string {
  const raw =
    err && typeof err === "object" && "message" in err && typeof err.message === "string" ? err.message : "";
  const msg = raw.toLowerCase();

  if (!raw) return fallback;
  if (msg.includes("invalid login credentials")) return "Email ou senha incorretos";
  if (msg.includes("email not confirmed")) return "Confirme seu email antes de fazer login";
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Este email já está cadastrado";
  }
  if (msg.includes("invalid api key") || msg.includes("no api key")) {
    return "Configuração do servidor inválida (chave da API). Avise o suporte.";
  }
  if (msg.includes("password should be at least")) {
    const min = raw.match(/\d+/)?.[0];
    return min ? `A senha precisa ter pelo menos ${min} caracteres` : "A senha é curta demais";
  }
  if (msg.includes("weak") && msg.includes("password")) return "Senha fraca. Use letras, números e símbolos.";
  if (msg.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (msg.includes("error sending") && msg.includes("email")) {
    return "Não foi possível enviar o email de confirmação. Tente de novo mais tarde.";
  }
  if (msg.includes("signups not allowed") || msg.includes("signup is disabled")) {
    return "O cadastro de novas contas está desativado";
  }
  if (msg.includes("database error")) return "Erro no servidor ao salvar o usuário. Avise o suporte.";
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  }
  return `${fallback}: ${raw}`;
}
