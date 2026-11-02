const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 50 → "R$ 50,00" */
export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return brl.format(Number.isFinite(n) ? n : 0);
}
