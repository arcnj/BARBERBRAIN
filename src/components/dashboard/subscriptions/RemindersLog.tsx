import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Reminder {
  id: string;
  period_end: string;
  status: string;
  error: string | null;
  message: string | null;
  sent_at: string | null;
  created_at: string;
  subscription: {
    customer_id: string;
    plan: { name: string } | null;
  } | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  sent: { label: "Enviado", className: "bg-success/10 text-success" },
  failed: { label: "Falhou", className: "bg-destructive/10 text-destructive" },
  skipped: { label: "Não enviado", className: "bg-warning/10 text-warning" },
  pending: { label: "Pendente", className: "bg-muted text-muted-foreground" },
};

export function RemindersLog() {
  const { data, isLoading } = useQuery({
    queryKey: ["subscription-reminders"],
    queryFn: async () => {
      const { data: reminders, error } = await supabase
        .from("subscription_reminders")
        .select("*, subscription:customer_subscriptions(customer_id, plan:subscription_plans(name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const ids = [
        ...new Set(
          (reminders || [])
            .map((r) => (r as unknown as Reminder).subscription?.customer_id)
            .filter(Boolean) as string[],
        ),
      ];
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", ids)
        : { data: [] };

      const names = new Map((profiles || []).map((p) => [p.user_id, p.full_name]));
      return (reminders || []).map((r) => {
        const rem = r as unknown as Reminder;
        return {
          ...rem,
          customerName: names.get(rem.subscription?.customer_id ?? "") ?? "Cliente",
        };
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <Card className="glass">
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum aviso enviado ainda. Os avisos saem automaticamente 3 dias antes do vencimento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((r) => {
        const status = statusLabels[r.status] ?? statusLabels.pending;
        return (
          <Card key={r.id} className="glass">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">{r.customerName}</span>
                <Badge className={status.className}>{status.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {r.subscription?.plan?.name} · vencimento{" "}
                {format(parseISO(r.period_end), "dd/MM/yyyy")} ·{" "}
                {format(parseISO(r.sent_at ?? r.created_at), "dd/MM/yyyy HH:mm")}
              </p>
              {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
              {r.error && <p className="text-xs text-destructive">{r.error}</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
