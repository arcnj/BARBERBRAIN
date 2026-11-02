import { useMutation, useQueryClient } from "@tanstack/react-query";
import { joinBarbershop } from "../api/barbershop-link.api";
import { agendamentoKeys } from "../api/keys";
import { rememberBarbershopSlug } from "../domain/last-barbershop";

/** Entra na barbearia do link e faz dela a barbearia atual da área do cliente. */
export function useJoinBarbershop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => joinBarbershop(slug),
    onSuccess: (_shopId, slug) => {
      rememberBarbershopSlug(slug);
      return queryClient.invalidateQueries({ queryKey: agendamentoKeys.all });
    },
  });
}
