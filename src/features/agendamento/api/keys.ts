export const agendamentoKeys = {
  all: ["agendamento"] as const,
  barbershopPublic: (slug: string) => [...agendamentoKeys.all, "barbershop-public", slug] as const,
  myBarbershops: (userId: string) => [...agendamentoKeys.all, "my-barbershops", userId] as const,
  slots: (barbershopId: string, barberId: string, date: string, serviceIds: string[]) =>
    [...agendamentoKeys.all, "slots", barbershopId, barberId, date, [...serviceIds].sort().join(",")] as const,
};
