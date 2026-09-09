import { useEffect, useMemo, useState } from "react";
import { addMonths, format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  PAYMENT_METHODS,
  SubscriptionRow,
  useConfirmSubscriptionPayment,
} from "@/hooks/useSubscriptionCycles";

interface Props {
  subscription: SubscriptionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmPaymentDialog({ subscription, open, onOpenChange }: Props) {
  const confirmPayment = useConfirmSubscriptionPayment();
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open && subscription) {
      setAmount(String(Number(subscription.plan?.price ?? 0).toFixed(2)));
      setPaidAt(format(new Date(), "yyyy-MM-dd"));
      setMethod("pix");
      setNotes("");
    }
  }, [open, subscription]);

  const preview = useMemo(() => {
    if (!subscription) return null;
    const cycleEnd = subscription.cycle
      ? parseISO(subscription.cycle.period_end)
      : parseISO(subscription.current_period_end);
    const paid = parseISO(paidAt);
    // mesma política aplicada no banco: em dia mantém o vencimento como
    // início; atrasado começa na data do pagamento
    const start = cycleEnd > paid ? cycleEnd : paid;
    return { start, end: addMonths(start, 1) };
  }, [subscription, paidAt]);

  if (!subscription) return null;

  const submit = async () => {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    try {
      const cycle = await confirmPayment.mutateAsync({
        subscriptionId: subscription.id,
        amount: value,
        paidAt,
        method,
        notes,
      });
      toast.success(
        `Pagamento confirmado! Novo ciclo até ${format(parseISO(cycle.period_end), "dd/MM/yyyy")}`,
      );
      onOpenChange(false);
    } catch {
      /* erro já exibido pelo hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="font-medium">{subscription.customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-medium">{subscription.plan?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor previsto</p>
              <p className="font-medium text-primary">
                R$ {Number(subscription.plan?.price ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="font-medium">
                {format(parseISO(subscription.current_period_end), "dd/MM/yyyy")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor recebido</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data do pagamento</Label>
              <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: pago na maquininha, parcelado em 1x"
            />
          </div>

          {preview && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
              <CalendarClock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>
                Este pagamento iniciará um novo ciclo de{" "}
                <strong>{format(preview.start, "dd/MM/yyyy")}</strong> até{" "}
                <strong>{format(preview.end, "dd/MM/yyyy")}</strong>, liberando novamente os
                benefícios do plano.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={confirmPayment.isPending}>
            {confirmPayment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar e renovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
