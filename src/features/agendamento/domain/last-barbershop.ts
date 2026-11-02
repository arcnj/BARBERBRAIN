const KEY = "barberbrain:barbershop-slug";

/** Guarda a última barbearia visitada pelo link (conveniência; nunca é fonte de verdade). */
export function rememberBarbershopSlug(slug: string): void {
  try {
    localStorage.setItem(KEY, slug);
  } catch {
    /* navegação privada ou armazenamento bloqueado */
  }
}

export function lastBarbershopSlug(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
