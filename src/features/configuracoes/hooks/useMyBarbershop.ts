import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getMyAdminBarbershop, updateBarbershopSlug } from "../api/barbershop.api";
import { configuracoesKeys } from "../api/keys";

export function useMyBarbershop() {
  const { user } = useAuth();
  return useQuery({
    queryKey: configuracoesKeys.myBarbershop(user?.id ?? ""),
    queryFn: () => getMyAdminBarbershop(user!.id),
    enabled: !!user,
  });
}

export function useUpdateBarbershopSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ barbershopId, slug }: { barbershopId: string; slug: string }) =>
      updateBarbershopSlug(barbershopId, slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: configuracoesKeys.all }),
  });
}
