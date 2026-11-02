/** Deixa só os dígitos e garante o DDI 55 em números brasileiros (10 ou 11 dígitos). */
export function normalizeBRPhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

/**
 * Link do WhatsApp com mensagem pronta. Sem telefone, abre o WhatsApp para a pessoa
 * escolher o contato (útil para compartilhar).
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const text = encodeURIComponent(message);
  const number = normalizeBRPhone(phone);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
