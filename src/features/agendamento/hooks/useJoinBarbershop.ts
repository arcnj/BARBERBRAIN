import { useMutation } from "@tanstack/react-query";
import { joinBarbershop } from "../api/barbershop-link.api";

export function useJoinBarbershop() {
  return useMutation({ mutationFn: (slug: string) => joinBarbershop(slug) });
}
