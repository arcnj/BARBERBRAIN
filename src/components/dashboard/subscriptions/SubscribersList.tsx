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
import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Loader2, Plus, RefreshCw, Users, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  start_date: string;
  current_period_end: string;
  status: string;
  auto_reminder: boolean;
  plan: { name: string; price: number } | null;
}

type Filter = "all" | "due" | "overdue" | "cancelled";

function statusOf(sub: Subscription) {
  if (sub.status === "cancelled") return "Cancelada";
  const days = differenceInCalendarDays(parseISO(sub.current_period_end), new Date());
  if (days < 0) return "Vencida";
  if (days <= 7) return "Vencendo";
  return "Ativa";
}

const statusStyles: Record<string, string> = {
  Ativa: "bg-success/10 text-success",
  Vencendo: "bg-warning/10 text-warning",
  Vencida: "bg-destructive/10 text-destructive",
  Cancelada: "bg-muted text-muted-foreground",
};

export function SubscribersList() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    plan_id: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    current_period_end: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
  });

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["customer-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .select("*, plan:subscription_plans(name, price)")
        .order("current_period_end");
      if (error) throw error;
      return (data || []) as unknown as Subscription[];
    },
  });

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

  const customerMap = useMemo(
    () => new Map((customers || []).map((c) => [c.user_id, c])),
    [customers],
  );

  const createSubscription = useMutation({
    mutationFn: async () => {
      if (!form.customer_id || !form.plan_id) throw new Error("Escolha o cliente e o plano");
      const { error } = await supabase.from("customer_subscriptions").insert({
        customer_id: form.customer_id,
        plan_id: form.plan_id,
        start_date: form.start_date,
        current_period_end: form.current_period_end,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assinante adicionado!");
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
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

  const renew = useMutation({
    mutationFn: async (sub: Subscription) => {
      const base = parseISO(sub.current_period_end) > new Date()
        ? parseISO(sub.current_period_end)
        : new Date();
      const newEnd = format(addMonths(base, 1), "yyyy-MM-dd");

      const { error } = await supabase
        .from("customer_subscriptions")
        .update({ current_period_end: newEnd, status: "active" })
        .eq("id", sub.id);
      if (error) throw error;

      const { error: payError } = await supabase.from("subscription_payments").insert({
        subscription_id: sub.id,
        amount: Number(sub.plan?.price ?? 0),
        period_end: newEnd,
        method: "manual",
      });
      if (payError) throw payError;
      return newEnd;
    },
    onSuccess: (newEnd) => {
      toast.success(`Renovada até ${format(parseISO(newEnd), "dd/MM/yyyy")}`);
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("customer_subscriptions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["customer-subscriptions"] });
    },
  });

  const list = (subscriptions || []).filter((sub) => {
    const s = statusOf(sub);
    if (filter === "due") return s === "Vencendo";
    if (filter === "overdue") return s === "Vencida";
    if (filter === "cancelled") return s === "Cancelada";
    return true;
  });

  const active = (subscriptions || []).filter((s) => s.status === "active");
  const mrr = active.reduce((sum, s) => sum + Number(s.plan?.price ?? 0), 0);
  const dueSoon = active.filter((s) => statusOf(s) === "Vencendo").length;

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
            ["due", "Vencendo"],
            ["overdue", "Vencidas"],
            ["cancelled", "Canceladas"],
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

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length ? (
        <div className="space-y-3">
          {list.map((sub) => {
            const profile = customerMap.get(sub.customer_id);
            const status = statusOf(sub);
            const days = differenceInCalendarDays(parseISO(sub.current_period_end), new Date());
            const name = profile?.full_name || "Cliente";
            return (
              <Card key={sub.id} className="glass">
                <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{name}</span>
                      <Badge className={statusStyles[status]}>{status}</Badge>
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
                        (days >= 0 ? ` · faltam ${days} dia(s)` : ` · atrasada ${-days} dia(s)`)}
                    </p>
                    {!profile?.phone && (
                      <p className="text-xs text-destructive">Sem telefone — aviso não é enviado</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Switch
                        checked={sub.auto_reminder}
                        onCheckedChange={(v) =>
                          toggleReminder.mutate({ id: sub.id, value: v })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Aviso automático</span>
                    </div>
                    <WhatsAppButton
                      phone={profile?.phone}
                      name={name}
                      variant="outline"
                      size="sm"
                      showLabel
                      message={`Oi ${name.split(" ")[0]}! Sua assinatura ${sub.plan?.name ?? ""} vence em ${format(parseISO(sub.current_period_end), "dd/MM/yyyy")}. Quer renovar?`}
                    />
                    <Button size="sm" onClick={() => renew.mutate(sub)} disabled={renew.isPending}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Renovar
                    </Button>
                    {sub.status === "cancelled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus.mutate({ id: sub.id, status: "active" })}
                      >
                        Reativar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setStatus.mutate({ id: sub.id, status: "cancelled" })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum assinante nesse filtro.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
