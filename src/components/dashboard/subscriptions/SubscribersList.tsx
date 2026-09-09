import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  SubscriptionRow,
  statusClasses,
  statusLabels,
  paymentMethodLabel,
  useSubscriptionsOverview,
} from "@/hooks/useSubscriptionCycles";
import { UsageBar } from "./UsageBar";
import { ConfirmPaymentDialog } from "./ConfirmPaymentDialog";
import { SubscriptionDetailsSheet } from "./SubscriptionDetailsSheet";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "pending" | "overdue" | "cancelled";

export function SubscribersList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<SubscriptionRow | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<SubscriptionRow | null>(null);
  const [form, setForm] = useState({
    customer_id: "",
    plan_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    current_period_end: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
  });

  const { rows, isLoading } = useSubscriptionsOverview();

  const { data: customers } = useQuery({
    queryKey: ["subscription-customers"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");
      const ids = (roles || []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", ids)
        .order("full_name");
      return data || [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("id, name, price")
        .eq("active", true)
        .order("name");
      return data || [];
    },
  });

  const createSubscription = useMutation({
    mutationFn: async () => {
      if (!form.customer_id || !form.plan_id) throw new Error("Escolha o cliente e o plano");
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .insert({
          customer_id: form.customer_id,
          plan_id: form.plan_id,
          start_date: form.start_date,
          current_period_end: form.current_period_end,
        })
        .select("id")
        .single();
      if (error) throw error;

      // ciclo inicial vigente, para o controle de utilizações começar já
      const { error: cycleError } = await supabase.from("subscription_cycles").insert({
        subscription_id: data.id,
        customer_id: form.customer_id,
        plan_id: form.plan_id,
        period_start: form.start_date,
        period_end: form.current_period_end,
        status: "current",
      });
      if (cycleError) throw cycleError;
    },
    onSuccess: () => {
      toast.success("Assinante adicionado!");
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
      queryClient.invalidateQueries({ queryKey: ["active-subscriptions-map"] });
      setOpen(false);
      setForm({
        customer_id: "",
        plan_id: "",
        start_date: format(new Date(), "yyyy-MM-dd"),
        current_period_end: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("customer_subscriptions")
        .update({ auto_reminder: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions-overview"] });
    },
  });

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((sub) => {
      if (filter !== "all" && sub.uiStatus !== filter) return false;
      if (!term) return true;
      return (
        sub.customerName.toLowerCase().includes(term) ||
        (sub.plan?.name ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, filter, search]);

  const active = rows.filter((s) => s.status === "active");
  const mrr = active.reduce((sum, s) => sum + Number(s.plan?.price ?? 0), 0);
  const dueSoon = rows.filter((s) => s.uiStatus === "pending").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Assinantes ativos" value={String(active.length)} icon={Users} />
        <StatCard
          title="Receita recorrente"
          value={`R$ ${mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={CheckCircle2}
        />
        <StatCard title="Vencendo em 7 dias" value={String(dueSoon)} icon={CalendarClock} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Todos"],
            ["active", "Ativos"],
            ["pending", "Pendentes"],
            ["overdue", "Vencidos"],
            ["cancelled", "Cancelados"],
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

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-44 sm:w-56"
              placeholder="Buscar cliente ou plano"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Novo assinante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo assinante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.customer_id}
                    onValueChange={(v) => setForm({ ...form, customer_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {(customers || []).map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={form.plan_id}
                    onValueChange={(v) => setForm({ ...form, plan_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {(plans || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — R$ {Number(p.price).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input
                      type="date"
                      value={form.current_period_end}
                      onChange={(e) => setForm({ ...form, current_period_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createSubscription.mutate()}
                  disabled={createSubscription.isPending}
                >
                  {createSubscription.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
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
                <div className="space-y-1.5 md:max-w-md flex-1">
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
                    Vence em{" "}
                    {format(parseISO(sub.current_period_end), "dd 'de' MMMM", { locale: ptBR })}
                    {sub.status !== "cancelled" &&
                      (sub.daysToDue >= 0
                        ? ` · faltam ${sub.daysToDue} dia(s)`
                        : ` · atrasada ${-sub.daysToDue} dia(s)`)}
                    {sub.lastPayment &&
                      ` · último pagamento ${format(parseISO(sub.lastPayment.paid_at), "dd/MM")} (${paymentMethodLabel(
                        sub.lastPayment.payment_method || sub.lastPayment.method,
                      )})`}
                  </p>
                  <UsageBar used={sub.usedCount} limit={sub.limit} />
                  {!sub.customerPhone && (
                    <p className="text-xs text-destructive">Sem telefone — aviso não é enviado</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 mr-2">
                    <Switch
                      checked={sub.auto_reminder}
                      onCheckedChange={(v) => toggleReminder.mutate({ id: sub.id, value: v })}
                    />
                    <span className="text-xs text-muted-foreground">Aviso automático</span>
                  </div>
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
            Nenhum assinante nesse filtro.
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
