/** Regras do endereço do link da barbearia (iguais à constraint de barbershops.slug). */
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Barbearia do Zé!" → "barbearia-do-ze" */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/** Mensagem de erro em português, ou null se o slug é válido. */
export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN) return `Use pelo menos ${SLUG_MIN} caracteres`;
  if (slug.length > SLUG_MAX) return `Use no máximo ${SLUG_MAX} caracteres`;
  if (!SLUG_RE.test(slug)) return "Use só letras minúsculas, números e hífens (sem hífen no começo ou no fim)";
  return null;
}
