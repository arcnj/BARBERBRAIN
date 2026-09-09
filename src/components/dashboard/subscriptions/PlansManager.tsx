import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  benefits: string[];
  active: boolean;
  monthly_visit_limit: number | null;
}

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface PlanServiceRow {
  plan_id: string;
  service_id: string;
  monthly_limit: number | null;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  benefits: "",
  active: true,
  monthly_visit_limit: "",
};

export function PlansManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);
  /** serviços inclusos: service_id -> quantidade por mês ("" = ilimitado) */
  const [planServices, setPlanServices] = useState<Record<string, string>>({});

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price");
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services-for-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("active", true)
        .order("category");
      if (error) throw error;
      return (data || []) as ServiceRow[];
    },
  });

  const { data: allPlanServices } = useQuery({
    queryKey: ["subscription-plan-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plan_services")
        .select("plan_id, service_id, monthly_limit");
      if (error) throw error;
      return (data || []) as PlanServiceRow[];
    },
  });

  const servicesById = new Map((services ?? []).map((s) => [s.id, s]));
  const groupedServices = (services ?? []).reduce<Record<string, ServiceRow[]>>((acc, s) => {
    const key = s.category || "Outros";
    acc[key] = acc[key] || [];
    acc[key].push(s);
    return acc;
  }, {});

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price.replace(",", ".")) || 0,
        benefits: form.benefits
          .split("\n")
          .map((b) => b.trim())
          .filter(Boolean),
        active: form.active,
        monthly_visit_limit:
          form.monthly_visit_limit.trim() === ""
            ? null
            : Math.max(1, Number(form.monthly_visit_limit)) || null,
      };
      if (!payload.name) throw new Error("Informe o nome do plano");

      let planId = editing?.id;

      if (editing) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("subscription_plans")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        planId = data.id;
      }

      if (!planId) return;

      // sincroniza serviços inclusos
      const { error: delError } = await supabase
        .from("subscription_plan_services")
        .delete()
        .eq("plan_id", planId);
      if (delError) throw delError;

      const rows = Object.entries(planServices).map(([service_id, limit]) => ({
        plan_id: planId!,
        service_id,
        monthly_limit: limit.trim() === "" ? null : Math.max(1, Number(limit)) || null,
      }));

      if (rows.length) {
        const { error: insError } = await supabase
          .from("subscription_plan_services")
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Plano atualizado!" : "Plano criado!");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plan-services"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-coverage"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setPlanServices({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscription_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano removido");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-plan-services"] });
    },
    onError: () =>
      toast.error("Não foi possível remover. Talvez existam assinantes nesse plano."),
  });

  const openEdit = (plan: Plan) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      price: String(plan.price),
      benefits: (plan.benefits || []).join("\n"),
      active: plan.active,
      monthly_visit_limit:
        plan.monthly_visit_limit != null ? String(plan.monthly_visit_limit) : "",
    });
    const current: Record<string, string> = {};
    for (const ps of allPlanServices ?? []) {
      if (ps.plan_id === plan.id) {
        current[ps.service_id] = ps.monthly_limit != null ? String(ps.monthly_limit) : "";
      }
    }
    setPlanServices(current);
    setOpen(true);
  };

  const toggleService = (serviceId: string) => {
    setPlanServices((prev) => {
      const next = { ...prev };
      if (serviceId in next) delete next[serviceId];
      else next[serviceId] = "";
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Planos mensais que seus clientes podem assinar
        </p>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) {
              setEditing(null);
              setForm(emptyForm);
              setPlanServices({});
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Corte ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor mensal (R$)</Label>
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Ex: 149,90"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label>Serviços inclusos no plano</Label>
                <p className="text-xs text-muted-foreground">
                  Marque os serviços cobertos e a quantidade por mês (vazio = ilimitado).
                  Serviços fora do plano ficam como pagamento à parte.
                </p>
                <ScrollArea className="h-56 rounded-lg border border-border/50 p-3">
                  <div className="space-y-4">
                    {Object.entries(groupedServices).map(([category, list]) => (
                      <div key={category} className="space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {category}
                        </p>
                        {list.map((s) => {
                          const selected = s.id in planServices;
                          return (
                            <div key={s.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`plan-service-${s.id}`}
                                checked={selected}
                                onCheckedChange={() => toggleService(s.id)}
                              />
                              <Label
                                htmlFor={`plan-service-${s.id}`}
                                className="flex-1 text-sm font-normal cursor-pointer"
                              >
                                {s.name}
                                <span className="text-muted-foreground">
                                  {" "}
                                  · R$ {Number(s.price).toFixed(2)}
                                </span>
                              </Label>
                              {selected && (
                                <Input
                                  value={planServices[s.id]}
                                  onChange={(e) =>
                                    setPlanServices((prev) => ({
                                      ...prev,
                                      [s.id]: e.target.value.replace(/\D/g, ""),
                                    }))
                                  }
                                  placeholder="x/mês"
                                  inputMode="numeric"
                                  className="h-8 w-20 text-center"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    {!services?.length && (
                      <p className="text-sm text-muted-foreground">
                        Cadastre serviços para incluí-los nos planos.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>Limite geral de atendimentos por mês</Label>
                <Input
                  value={form.monthly_visit_limit}
                  onChange={(e) =>
                    setForm({ ...form, monthly_visit_limit: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="Ex: 4 (vazio = sem limite geral)"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Teto de atendimentos cobertos no mês, somando todos os serviços do plano.
                  Deixe vazio para usar apenas as quantidades por serviço.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="O que está incluso no plano"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Benefícios (um por linha)</Label>
                <Textarea
                  value={form.benefits}
                  onChange={(e) => setForm({ ...form, benefits: e.target.value })}
                  placeholder={"4 cortes por mês\n1 barba grátis"}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <Label>Plano ativo</Label>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
                {savePlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
      ) : plans?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const included = (allPlanServices ?? []).filter((ps) => ps.plan_id === plan.id);
            return (
              <Card key={plan.id} className="glass">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{plan.name}</h4>
                      <p className="text-2xl font-bold text-primary">
                        R$ {Number(plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-muted-foreground">/mês</span>
                      </p>
                    </div>
                    <Badge variant={plan.active ? "default" : "secondary"}>
                      {plan.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {plan.monthly_visit_limit != null
                      ? `${plan.monthly_visit_limit} atendimento(s) por mês`
                      : "Sem limite geral"}
                  </Badge>
                  {included.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Serviços inclusos</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {included.map((ps) => (
                          <li key={ps.service_id}>
                            • {servicesById.get(ps.service_id)?.name ?? "Serviço"}
                            {ps.monthly_limit != null
                              ? ` — ${ps.monthly_limit}x/mês`
                              : " — ilimitado"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  {plan.benefits?.length > 0 && (
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {plan.benefits.map((b, i) => (
                        <li key={i}>• {b}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deletePlan.mutate(plan.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum plano cadastrado ainda. Crie o primeiro plano de assinatura.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
