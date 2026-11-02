import type { Json } from "@/integrations/supabase/types";

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number | null;
}

export interface PublicBarber {
  id: string;
  name: string;
  avatar_url: string | null;
}

/** Dados públicos devolvidos por get_barbershop_public (página do link). */
export interface BarbershopPublic {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  services: PublicService[];
  barbers: PublicBarber[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : null);

/** Converte o JSON da RPC em tipos; devolve null se a barbearia não existe ou veio malformada. */
export function parseBarbershopPublic(data: Json | null): BarbershopPublic | null {
  if (!isRecord(data)) return null;
  const id = str(data.id);
  const name = str(data.name);
  const slug = str(data.slug);
  if (!id || !name || !slug) return null;

  const records = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isRecord) : []);
  const services: PublicService[] = records(data.services).map((s) => ({
    id: str(s.id) ?? "",
    name: str(s.name) ?? "",
    description: str(s.description),
    category: str(s.category) ?? "Outros",
    price: num(s.price) ?? 0,
    duration_minutes: num(s.duration_minutes),
  }));
  const barbers: PublicBarber[] = records(data.barbers).map((b) => ({
    id: str(b.id) ?? "",
    name: str(b.name) ?? "",
    avatar_url: str(b.avatar_url),
  }));

  return { id, name, slug, logo_url: str(data.logo_url), address: str(data.address), services, barbers };
}

/** Agrupa serviços por categoria, mantendo a ordem em que chegaram. */
export function groupServicesByCategory(services: PublicService[]): [string, PublicService[]][] {
  const groups = new Map<string, PublicService[]>();
  for (const service of services) {
    const list = groups.get(service.category) ?? [];
    list.push(service);
    groups.set(service.category, list);
  }
  return [...groups.entries()];
}
