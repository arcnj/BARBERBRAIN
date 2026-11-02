export const agendamentoKeys = {
  all: ["agendamento"] as const,
  barbershopPublic: (slug: string) => [...agendamentoKeys.all, "barbershop-public", slug] as const,
};
