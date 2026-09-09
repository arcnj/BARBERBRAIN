import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface Settings {
  id: string;
  enabled: boolean;
  days_before: number;
  message_template: string;
  twilio_template_sid: string | null;
  paused_reason: string | null;
}

export function ReminderSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription-reminder-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_reminder_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async (patch: Partial<Settings>) => {
      if (!form) return;
      const { error } = await supabase
        .from("subscription_reminder_settings")
        .update(patch)
        .eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração salva!");
      queryClient.invalidateQueries({ queryKey: ["subscription-reminder-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("send-subscription-reminders");
      if (error) throw error;
      return data as { sent?: number; failed?: number; skipped?: number; paused?: string };
    },
    onSuccess: (result) => {
      if (result?.paused) toast.error(result.paused);
      else
        toast.success(
          `Enviados: ${result?.sent ?? 0} · Não enviados: ${result?.skipped ?? 0} · Falhas: ${result?.failed ?? 0}`,
        );
      queryClient.invalidateQueries({ queryKey: ["subscription-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-reminder-settings"] });
    },
    onError: () => toast.error("Não foi possível executar o envio agora."),
  });

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {form.paused_reason && (
        <Card className="glass border-destructive/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{form.paused_reason}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setForm({ ...form, paused_reason: null });
                  save.mutate({ paused_reason: null, paused_at: null } as Partial<Settings>);
                }}
              >
                Retomar envios
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Aviso de renovação</CardTitle>
          <CardDescription>
            A mensagem é enviada automaticamente uma vez por dia, para quem vence dentro do prazo
            escolhido. Cada cliente recebe apenas um aviso por vencimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
            <div>
              <Label>Envio automático ligado</Label>
              <p className="text-xs text-muted-foreground">Desligue para pausar todos os avisos</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => {
                setForm({ ...form, enabled: v });
                save.mutate({ enabled: v });
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Avisar quantos dias antes</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={form.days_before}
              onChange={(e) => setForm({ ...form, days_before: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              rows={4}
              value={form.message_template}
              onChange={(e) => setForm({ ...form, message_template: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{nome}"}, {"{plano}"}, {"{data}"} e {"{valor}"} — eles são trocados pelos dados
              do cliente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Código do modelo aprovado no WhatsApp (opcional)</Label>
            <Input
              value={form.twilio_template_sid ?? ""}
              onChange={(e) => setForm({ ...form, twilio_template_sid: e.target.value })}
              placeholder="HX..."
            />
            <p className="text-xs text-muted-foreground">
              Necessário para o envio automático fora da janela de 24h do WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                save.mutate({
                  days_before: form.days_before,
                  message_template: form.message_template,
                  twilio_template_sid: form.twilio_template_sid || null,
                })
              }
              disabled={save.isPending}
            >
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
              {runNow.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar avisos agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
