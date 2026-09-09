import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { Check, Inbox, Loader2, Wallet, X } from "lucide-react";
import {
  SubscriptionRequest,
  useRejectSubscriptionRequest,
  useSubscriptionRequests,
} from "@/hooks/useSubscriptionRequests";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";

type Filter = "pending" | "approved" | "rejected";

export function RequestsTab() {
  const { data, isLoading } = useSubscriptionRequests();
  const reject = useRejectSubscriptionRequest();
  const [filter, setFilter] = useState<Filter>("pending");
  const [approveTarget, setApproveTarget] = useState<SubscriptionRequest | null>(null);

  const rows = data ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const approvedThisList = rows.filter((r) => r.status === "approved");
  const receivedFromRequests = approvedThisList.reduce(
    (sum, r) => sum + Number(r.paidAmount ?? 0),
    0,
  );

  const list = useMemo(() => rows.filter((r) => r.status === filter), [rows, filter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Pedidos aguardando" value={String(pending.length)} icon={Inbox} />
        <StatCard title="Pedidos aprovados" value={String(approvedThisList.length)} icon={Check} />
        <StatCard
          title="Recebido por pedidos"
          value={`R$ ${receivedFromRequests.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={Wallet}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["pending", `Aguardando${pending.length ? ` (${pending.length})` : ""}`],
          ["approved", "Aprovados"],
          ["rejected", "Recusados"],
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
          {list.map((req) => (
            <Card key={req.id} className="glass">
              <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{req.customerName}</span>
                    <Badge variant="outline" className="text-xs">
                      {req.kind === "renewal" ? "Renovação" : "Nova assinatura"}
                    </Badge>
                    {req.status === "approved" && (
                      <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">
                        Aprovado
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Recusado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {req.planName} · R$
                    {req.planPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pedido em{" "}
                    {format(parseISO(req.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    {req.status === "approved" && req.paidAmount != null && (
                      <>
                        {" · "}
                        <span className="text-success font-medium">
                          Pago R${" "}
                          {req.paidAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </>
                    )}
                  </p>
                  {!req.customerPhone && (
                    <p className="text-xs text-destructive">Cliente sem telefone cadastrado</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <WhatsAppButton
                    phone={req.customerPhone ?? undefined}
                    name={req.customerName}
                    variant="outline"
                    size="sm"
                    showLabel
                    message={`Oi ${req.customerName.split(" ")[0]}! Recebi seu pedido do plano ${req.planName}. Vamos combinar o pagamento?`}
                  />
                  {req.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => setApproveTarget(req)}>
                        <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        disabled={reject.isPending}
                        onClick={() => reject.mutate(req.id)}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Recusar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            {filter === "pending"
              ? "Nenhum pedido aguardando aprovação."
              : "Nenhum pedido nesse filtro."}
          </CardContent>
        </Card>
      )}

      <ConfirmPaymentDialog
        request={approveTarget}
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
      />
    </div>
  );
}
