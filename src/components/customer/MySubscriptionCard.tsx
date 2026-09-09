import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MySubscription {
  current_period_end: string;
  status: string;
  plan: { name: string; price: number } | null;
}

export function MySubscriptionCard({ userId }: { userId: string | undefined }) {
  const [subscription, setSubscription] = useState<MySubscription | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("customer_subscriptions")
        .select("current_period_end, status, plan:subscription_plans(name, price)")
        .eq("customer_id", userId)
        .eq("status", "active")
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) setSubscription((data as unknown as MySubscription) ?? null);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  if (!subscription) return null;

  const days = differenceInCalendarDays(parseISO(subscription.current_period_end), new Date());
  const expiring = days <= 7;

  return (
    <Card
      className={`mb-6 glass ${expiring ? "border-warning" : "border-primary/40"} bg-gradient-to-r from-primary/10 to-transparent`}
    >
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-primary/20">
            <BadgeCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-foreground text-lg">
                Assinatura {subscription.plan?.name}
              </h3>
              <Badge variant={expiring ? "destructive" : "default"}>
                {days < 0 ? "Vencida" : expiring ? "Renove já" : "Ativa"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {days < 0
                ? `Venceu em ${format(parseISO(subscription.current_period_end), "dd/MM/yyyy")}`
                : `Válida até ${format(parseISO(subscription.current_period_end), "dd 'de' MMMM", { locale: ptBR })} · faltam ${days} dia(s)`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
