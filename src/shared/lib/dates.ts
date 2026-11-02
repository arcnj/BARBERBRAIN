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
