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

      if (editing) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Plano atualizado!" : "Plano criado!");
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
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
    setOpen(true);
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
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo plano
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                <Label>Cortes por mês</Label>
                <Input
                  value={form.monthly_visit_limit}
                  onChange={(e) =>
                    setForm({ ...form, monthly_visit_limit: e.target.value.replace(/\D/g, "") })
                  }
                  placeholder="Ex: 4 (vazio = ilimitado)"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Quantos atendimentos o cliente pode agendar por mês com esse plano. Ao atingir o
                  limite, novos agendamentos ficam bloqueados até o próximo ciclo.
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
          {plans.map((plan) => (
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
                    ? `${plan.monthly_visit_limit} corte(s) por mês`
                    : "Cortes ilimitados"}
                </Badge>
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
          ))}
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
