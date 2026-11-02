import { useQuery } from "@tanstack/react-query";
import { getBarbershopPublic } from "../api/barbershop-link.api";
import { agendamentoKeys } from "../api/keys";

export function useBarbershopPublic(slug: string | undefined) {
  return useQuery({
    queryKey: agendamentoKeys.barbershopPublic(slug ?? ""),
    queryFn: () => getBarbershopPublic(slug!),
    enabled: !!slug,
    staleTime: 60_000,
  });
}
