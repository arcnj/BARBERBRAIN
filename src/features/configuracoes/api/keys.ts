export const configuracoesKeys = {
  all: ["configuracoes"] as const,
  myBarbershop: (userId: string) => [...configuracoesKeys.all, "my-barbershop", userId] as const,
};
