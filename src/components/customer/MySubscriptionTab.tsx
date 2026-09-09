import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck, Check, Loader2, MessageCircle, Receipt, Sparkles } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSubscriptionQuota } from "@/hooks/useSubscriptionQuota";
import { useMySubscriptionRequest } from "@/hooks/useSubscriptionRequests";
import { toast } from "sonner";


interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  benefits: string[];
}

interface Subscription {
  id: string;
  current_period_end: string;
  start_date: string;
  status: string;
  plan: Plan | null;
}

interface Payment {
  id: string;
  amount: number;
  paid_at: string;
  method: string | null;
}

function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`;
}

export function MySubscriptionTab({
  userId,
  barbershopWhatsapp,
  customerName,
}: {
  userId: string | undefined;
  barbershopWhatsapp?: string;
  customerName?: string;
}) {
  const { pendingRequest, createRequest } = useMySubscriptionRequest(userId);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["my-subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .select(
          "id, current_period_end, start_date, status, plan:subscription_plans(id, name, description, price, benefits)"
        )
        .eq("customer_id", userId!)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Subscription) ?? null;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["my-subscription-payments", subscription?.id],
    enabled: !!subscription?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("id, amount, paid_at, method")
        .eq("subscription_id", subscription!.id)
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["available-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, description, price, benefits")
        .eq("active", true)
        .order("price");
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const requestButton = (
    planId: string,
    kind: "new" | "renewal",
    subscriptionId: string | null,
    label: string,
    message: string,
  ) => (
    <Button
      variant="outline"
      className="gap-2 border-primary/40 text-primary"
      disabled={!planId || !!pendingRequest || createRequest.isPending}
      onClick={async () => {
        if (!planId) return;
        await createRequest.mutateAsync({ planId, kind, subscriptionId });
        toast.success("Pedido enviado! Aguarde a confirmação da barbearia.");
        if (barbershopWhatsapp) {
          window.open(whatsappLink(barbershopWhatsapp, message), "_blank");
        }
      }}
    >
      {createRequest.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {pendingRequest ? "Pedido em análise" : label}
    </Button>
  );

  const days = subscription
    ? differenceInCalendarDays(parseISO(subscription.current_period_end), new Date())
    : 0;
  const active = subscription?.status === "active";


  return (
    <div className="space-y-6">
      {subscription ? (
        <>
          <Card className="glass border-primary/40 bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  {subscription.plan?.name ?? "Assinatura"}
                </CardTitle>
                <Badge variant={!active || days < 0 ? "destructive" : days <= 7 ? "secondary" : "default"}>
                  {!active ? "Cancelada" : days < 0 ? "Vencida" : days <= 7 ? "Renove já" : "Ativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Valor mensal</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {Number(subscription.plan?.price ?? 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Válida até</p>
                  <p className="text-sm font-medium">
                    {format(parseISO(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dias restantes</p>
                  <p className="text-sm font-medium">{days < 0 ? "Vencida" : `${days} dia(s)`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cortes no mês</p>
                  <p className="text-sm font-medium">
                    {quota?.limit == null
                      ? "Ilimitados"
                      : `${quota.used} de ${quota.limit} usados`}
                  </p>
                </div>
              </div>

              {quota?.blocked && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  Você já usou todos os cortes deste ciclo. Fale com a barbearia para liberar mais
                  atendimentos.
                </div>
              )}

              {(subscription.plan?.benefits?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" /> Benefícios inclusos
                    </p>
                    <ul className="space-y-1">
                      {subscription.plan!.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {requestButton(
                subscription.plan?.id ?? "",
                "renewal",
                subscription.id,
                "Renovar pelo WhatsApp",
                `Olá! Sou ${customerName || "cliente"} e quero renovar minha assinatura ${subscription.plan?.name ?? ""}.`,
              )}

            </CardContent>
          </Card>

          <Card className="glass border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" />
                Histórico de pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!payments || payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{format(parseISO(p.paid_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                      <span className="text-muted-foreground">{p.method || "—"}</span>
                      <span className="font-semibold text-primary">R$ {Number(p.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <Card className="glass border-border/50">
            <CardContent className="py-6 text-center space-y-2">
              <BadgeCheck className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Você ainda não tem uma assinatura.</p>
              <p className="text-sm text-muted-foreground">
                Escolha um plano abaixo e fale com a barbearia para começar.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {(plans ?? []).map((plan) => (
              <Card key={plan.id} className="glass border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold text-primary">
                    R$ {Number(plan.price).toFixed(2)}
                    <span className="text-xs font-normal text-muted-foreground"> /mês</span>
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  {plan.benefits?.length > 0 && (
                    <ul className="space-y-1">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {requestButton(plan.id, "new", null, `Quero assinar`, `Olá! Sou ${customerName || "cliente"} e quero assinar o plano ${plan.name}.`)}

                </CardContent>
              </Card>
            ))}
            {(plans ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
