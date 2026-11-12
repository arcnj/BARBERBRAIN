const SAO_PAULO = "America/Sao_Paulo";

/** Mês (1-12) e ano no fuso de São Paulo, independente do fuso do aparelho. */
export function monthYearInSaoPaulo(date: Date = new Date()): { month: number; year: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO, year: "numeric", month: "2-digit" })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  return { month: Number(parts.month), year: Number(parts.year) };
}

/** Data "de hoje" (AAAA-MM-DD) no fuso de São Paulo. */
export function todayInSaoPaulo(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SAO_PAULO }).format(date);
}

/** Data (AAAA-MM-DD) e hora (HH:MM) no horário de São Paulo → instante ISO (UTC). */
export function saoPauloToISO(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAO_PAULO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(guess))
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  const asSaoPaulo = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return new Date(guess - (asSaoPaulo - guess)).toISOString();
}
