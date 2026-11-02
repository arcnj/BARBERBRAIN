/** Barbearia atual: a escolhida/visitada por último (se o usuário ainda pertence a ela) ou a primeira. */
export function pickCurrentBarbershop<T extends { slug: string }>(
  barbershops: T[],
  preferredSlug: string | null,
): T | null {
  if (barbershops.length === 0) return null;
  return barbershops.find((b) => b.slug === preferredSlug) ?? barbershops[0];
}
