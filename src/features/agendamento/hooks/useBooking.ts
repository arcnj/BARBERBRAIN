import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agendamentoKeys } from "../api/keys";
import { createAppointment, fetchAvailableSlots, type CreateAppointmentInput } from "../api/booking.api";

export function useAvailableSlots(params: {
  barbershopId?: string;
  barberId?: string;
  date?: string;
  serviceIds: string[];
}) {
  const { barbershopId, barberId, date, serviceIds } = params;
  return useQuery({
    queryKey: agendamentoKeys.slots(barbershopId ?? "", barberId ?? "", date ?? "", serviceIds),
    queryFn: () => fetchAvailableSlots({ barbershopId: barbershopId!, barberId: barberId!, date: date!, serviceIds }),
    enabled: !!barbershopId && !!barberId && !!date,
    staleTime: 15_000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSettled: () => {
      // horários mudaram para todo mundo (sucesso) ou o horário foi tomado (erro)
      queryClient.invalidateQueries({ queryKey: [...agendamentoKeys.all, "slots"] });
    },
  });
}
