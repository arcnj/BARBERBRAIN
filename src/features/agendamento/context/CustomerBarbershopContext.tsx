import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { listMyBarbershops, type MemberBarbershop } from "../api/my-barbershops.api";
import { agendamentoKeys } from "../api/keys";
import { lastBarbershopSlug, rememberBarbershopSlug } from "../domain/last-barbershop";
import { pickCurrentBarbershop } from "../domain/pick-barbershop";

interface CustomerBarbershopValue {
  /** Barbearia em que o cliente está agendando agora (null = ainda não entrou em nenhuma). */
  barbershop: MemberBarbershop | null;
  barbershops: MemberBarbershop[];
  isLoading: boolean;
  selectBarbershop: (slug: string) => void;
}

const CustomerBarbershopContext = createContext<CustomerBarbershopValue | undefined>(undefined);

/** Barbearia atual da área do cliente; todas as telas do cliente filtram por ela. */
export function CustomerBarbershopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferredSlug, setPreferredSlug] = useState<string | null>(() => lastBarbershopSlug());

  const { data: barbershops = [], isLoading } = useQuery({
    queryKey: agendamentoKeys.myBarbershops(user?.id ?? ""),
    queryFn: () => listMyBarbershops(user!.id),
    enabled: !!user,
  });

  const selectBarbershop = useCallback((slug: string) => {
    rememberBarbershopSlug(slug);
    setPreferredSlug(slug);
  }, []);

  const value = useMemo(
    () => ({
      barbershop: pickCurrentBarbershop(barbershops, preferredSlug),
      barbershops,
      isLoading: !!user && isLoading,
      selectBarbershop,
    }),
    [barbershops, preferredSlug, user, isLoading, selectBarbershop],
  );

  return <CustomerBarbershopContext.Provider value={value}>{children}</CustomerBarbershopContext.Provider>;
}

export function useCustomerBarbershop(): CustomerBarbershopValue {
  const ctx = useContext(CustomerBarbershopContext);
  if (!ctx) throw new Error("useCustomerBarbershop precisa estar dentro de CustomerBarbershopProvider");
  return ctx;
}
