import { format, parseISO } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Banknote, MessageCircle, Pause, Play, XCircle } from "lucide-react";
import {
  SubscriptionRow,
  paymentMethodLabel,
  statusClasses,
  statusLabels,
  useSubscriptionHistory,
  useSubscriptionStatusMutation,
} from "@/hooks/useSubscriptionCycles";
import { UsageBar } from "./UsageBar";
import { SubscriptionTimeline } from "./SubscriptionTimeline";
import { cn } from "@/lib/utils";

interface Props {
  subscription: SubscriptionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment: (subscription: SubscriptionRow) => void;
}

export function SubscriptionDetailsSheet({
  subscription,
  open,
  onOpenChange,
  onConfirmPayment,
}: Props) {
  const { data } = useSubscriptionHistory(subscription?.id);
  const statusMutation = useSubscriptionStatusMutation();

  if (!subscription) return null;

  const whatsapp = subscription.customerPhone
    ? `https://wa.me/55${subscription.customerPhone.replace(/\D/g, "")}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {subscription.customerName}
            <Badge variant="outline" className={cn("text-xs", statusClasses[subscription.uiStatus])}>
              {statusLabels[subscription.uiStatus]}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-medium">{subscription.plan?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor mensal</p>
              <p className="font-medium text-primary">
                R$ {Number(subscription.plan?.price ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ciclo vigente</p>
              <p className="font-medium">
                {subscription.cycle
                  ? `${format(parseISO(subscription.cycle.period_start), "dd/MM")} → ${format(
                      parseISO(subscription.cycle.period_end),
                      "dd/MM/yyyy",
                    )}`
                  : "Sem ciclo ativo"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Último pagamento</p>
              <p className="font-medium">
                {subscription.lastPayment
                  ? `${format(parseISO(subscription.lastPayment.paid_at), "dd/MM/yyyy")} · ${paymentMethodLabel(
                      subscription.lastPayment.payment_method || subscription.lastPayment.method,
                    )}`
                  : "Nenhum"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <p className="text-sm font-medium mb-2">Utilização do ciclo</p>
            <UsageBar used={subscription.usedCount} limit={subscription.limit} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onConfirmPayment(subscription)}>
              <Banknote className="h-4 w-4 mr-1" />
              Confirmar pagamento
            </Button>
            {whatsapp && (
              <Button size="sm" variant="outline" asChild>
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  WhatsApp
                </a>
              </Button>
            )}
            {subscription.status === "active" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => statusMutation.mutate({ id: subscription.id, status: "paused" })}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </Button>
            ) : (
              subscription.status !== "cancelled" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => statusMutation.mutate({ id: subscription.id, status: "active" })}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Reativar
                </Button>
              )
            )}
            {subscription.status !== "cancelled" && (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => statusMutation.mutate({ id: subscription.id, status: "cancelled" })}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>

          <Tabs defaultValue="historico">
            <TabsList>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            </TabsList>
            <TabsContent value="historico" className="mt-3">
              <SubscriptionTimeline events={data?.events ?? []} />
            </TabsContent>
            <TabsContent value="pagamentos" className="mt-3 space-y-2">
              {(data?.payments ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum pagamento registrado.
                </p>
              )}
              {(data?.payments ?? []).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">R$ {Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(p.paid_at), "dd/MM/yyyy")} ·{" "}
                      {paymentMethodLabel(p.payment_method || p.method)}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {p.status === "confirmed" ? "Confirmado" : p.status ?? "—"}
                  </Badge>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
