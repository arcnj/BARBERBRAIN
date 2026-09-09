import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Eye,
  Loader2,
  Wallet,
} from "lucide-react";
import {
  SubscriptionRow,
  statusClasses,
  statusLabels,
  useMonthlyReceived,
  useSubscriptionsOverview,
} from "@/hooks/useSubscriptionCycles";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";
import { SubscriptionDetailsSheet } from "./SubscriptionDetailsSheet";
import { UsageBar } from "./UsageBar";
import { cn } from "@/lib/utils";

type Filter = "todos" | "pending" | "overdue" | "paid";

export function RenewalsTab() {
  const { rows, isLoading } = useSubscriptionsOverview();
  const { data: received } = useMonthlyReceived();
  const [filter, setFilter] = useState<Filter>("todos");
  const [paymentTarget, setPaymentTarget] = useState<SubscriptionRow | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<SubscriptionRow | null>(null);

  const renewals = useMemo(
    () => rows.filter((r) => r.status !== "cancelled"),
    [rows],
  );

  const list = useMemo(() => {
    const filtered =
      filter === "todos"
        ? renewals
        : filter === "paid"
          ? renewals.filter((r) => r.uiStatus === "active")
          : renewals.filter((r) => r.uiStatus === filter);
    return [...filtered].sort((a, b) => a.daysToDue - b.daysToDue);
  }, [renewals, filter]);

  const pending = renewals.filter((r) => r.uiStatus === "pending").length;
  const overdue = renewals.filter((r) => r.uiStatus === "overdue").length;
  const expectedNext = renewals
    .filter((r) => r.uiStatus === "pending" || r.uiStatus === "overdue")
    .reduce((sum, r) => sum + Number(r.plan?.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Renovações pendentes" value={String(pending)} icon={CalendarClock} />
        <StatCard title="Pagamentos vencidos" value={String(overdue)} icon={AlertTriangle} />
        <StatCard
          title="A receber"
          value={`R$ ${expectedNext.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={Banknote}
        />
        <StatCard
          title="Recebido no mês"
          value={`R$ ${Number(received ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={Wallet}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["todos", "Todos"],
          ["pending", "Pendentes"],
          ["overdue", "Vencidos"],
          ["paid", "Em dia"],
        ] as [Filter, string][]).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? "default" : "outline"}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length ? (
        <div className="space-y-3">
          {list.map((sub) => (
            <Card key={sub.id} className="glass">
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex-1 space-y-1.5 md:max-w-md">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{sub.customerName}</span>
                    <Badge variant="outline" className={cn("text-xs", statusClasses[sub.uiStatus])}>
                      {statusLabels[sub.uiStatus]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.plan?.name} · R$
                    {Number(sub.plan?.price ?? 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                    /mês
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vencimento{" "}
                    {format(parseISO(sub.current_period_end), "dd 'de' MMMM", { locale: ptBR })}
                    {sub.daysToDue >= 0
                      ? ` · faltam ${sub.daysToDue} dia(s)`
                      : ` · atrasado ${-sub.daysToDue} dia(s)`}
                  </p>
                  <UsageBar used={sub.usedCount} limit={sub.limit} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <WhatsAppButton
                    phone={sub.customerPhone ?? undefined}
                    name={sub.customerName}
                    variant="outline"
                    size="sm"
                    showLabel
                    message={`Oi ${sub.customerName.split(" ")[0]}! Sua assinatura ${sub.plan?.name ?? ""} vence em ${format(parseISO(sub.current_period_end), "dd/MM/yyyy")}. Quer renovar?`}
                  />
                  <Button size="sm" onClick={() => setPaymentTarget(sub)}>
                    <Banknote className="h-3.5 w-3.5 mr-1" /> Confirmar pagamento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDetailsTarget(sub)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nada para cobrar nesse filtro.
          </CardContent>
        </Card>
      )}

      <ConfirmPaymentDialog
        subscription={paymentTarget}
        open={!!paymentTarget}
        onOpenChange={(o) => !o && setPaymentTarget(null)}
      />
      <SubscriptionDetailsSheet
        subscription={detailsTarget}
        open={!!detailsTarget}
        onOpenChange={(o) => !o && setDetailsTarget(null)}
        onConfirmPayment={(sub) => {
          setDetailsTarget(null);
          setPaymentTarget(sub);
        }}
      />
    </div>
  );
}
