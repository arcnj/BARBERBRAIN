import { useState } from "react";
import { Cake, Gift, PartyPopper, Settings, Loader2, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, getMonth, getDate, addDays, subDays, isSameDay, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SegmentCard } from "@/components/ui/segment-card";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface BirthdayClient {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  birthDate: Date;
  dayOfMonth: number;
  hasCoupon: boolean;
  couponUsed: boolean;
}

interface BirthdaySettings {
  id: string;
  enabled: boolean;
  default_discount_percentage: number;
  days_before: number;
  days_after: number;
  auto_create_coupon: boolean;
  message_template: string;
}

const DEFAULT_MESSAGE = 'Olá {nome}! 🎂 Feliz Aniversário! Temos um presente especial para você: um cupom de {desconto}% de desconto válido por {dias} dias. Venha nos visitar!';

function formatBirthdayMessage(template: string, client: { name: string }, settings: BirthdaySettings | null) {
  const firstName = client.name.split(' ')[0];
  const discount = settings?.default_discount_percentage || 10;
  const totalDays = (settings?.days_before || 7) + (settings?.days_after || 7);
  
  return template
    .replace(/{nome}/g, firstName)
    .replace(/{desconto}/g, String(discount))
    .replace(/{dias}/g, String(totalDays));
}

interface BirthdaySectionProps {
  defaultExpanded?: boolean;
}

export function BirthdaySection({ defaultExpanded = false }: BirthdaySectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<BirthdaySettings | null>(null);
  
  const today = new Date();
  const currentMonth = getMonth(today);
  const currentDay = getDate(today);

  // Fetch birthday settings
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["birthday-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("birthday_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as BirthdaySettings | null;
    },
  });

  // Fetch birthday coupons for current year
  const { data: birthdayCoupons } = useQuery({
    queryKey: ["birthday-coupons", new Date().getFullYear()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("birthday_coupons")
        .select("*")
        .eq("year", new Date().getFullYear());

      if (error) throw error;
      return data;
    },
  });

  // Fetch customers with birth dates
  const { data: birthdayClients, isLoading } = useQuery({
    queryKey: ["birthday-clients", currentMonth],
    queryFn: async () => {
      // Get all customer user_ids
      const { data: customerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      if (!customerRoles?.length) return [];

      const customerIds = customerRoles.map(r => r.user_id);

      // Get profiles for customers with birth_date
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, birth_date")
        .in("user_id", customerIds)
        .not("birth_date", "is", null);

      if (!profiles?.length) return [];

      // Filter clients who have birthday this month
      const clients: BirthdayClient[] = profiles
        .filter(p => {
          const birthDate = new Date(p.birth_date!);
          return getMonth(birthDate) === currentMonth;
        })
        .map(p => {
          const birthDate = new Date(p.birth_date!);
          const coupon = birthdayCoupons?.find(c => c.profile_id === p.id);
          
          return {
            id: p.id,
            userId: p.user_id,
            name: p.full_name || "Sem nome",
            phone: p.phone,
            birthDate,
            dayOfMonth: getDate(birthDate),
            hasCoupon: !!coupon,
            couponUsed: coupon?.used || false,
          };
        })
        .sort((a, b) => a.dayOfMonth - b.dayOfMonth);

      return clients;
    },
    enabled: !!birthdayCoupons,
  });

  // Create birthday coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: async (client: BirthdayClient) => {
      const discountPercentage = settings?.default_discount_percentage || 10;
      const daysBefore = settings?.days_before || 7;
      const daysAfter = settings?.days_after || 7;

      // Set valid dates around birthday
      const birthdayThisYear = new Date(today.getFullYear(), getMonth(client.birthDate), getDate(client.birthDate));
      const validFrom = subDays(birthdayThisYear, daysBefore);
      const validUntil = addDays(birthdayThisYear, daysAfter);

      const { error } = await supabase
        .from("birthday_coupons")
        .insert({
          profile_id: client.id,
          discount_percentage: discountPercentage,
          valid_from: format(validFrom, "yyyy-MM-dd"),
          valid_until: format(validUntil, "yyyy-MM-dd"),
          year: today.getFullYear(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["birthday-clients"] });
      toast({
        title: "Cupom criado!",
        description: "Cupom de aniversário criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Error creating coupon:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o cupom.",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<BirthdaySettings>) => {
      if (!settings?.id) return;
      
      const { error } = await supabase
        .from("birthday_settings")
        .update({
          ...newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["birthday-settings"] });
      toast({
        title: "Configurações salvas!",
        description: "As configurações de aniversário foram atualizadas.",
      });
      setSettingsOpen(false);
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const openSettings = () => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    if (localSettings) {
      updateSettingsMutation.mutate(localSettings);
    }
  };

  // Get today's birthdays
  const todayBirthdays = birthdayClients?.filter(c => c.dayOfMonth === currentDay) || [];
  
  // Get this week's birthdays (next 7 days)
  const thisWeekBirthdays = birthdayClients?.filter(c => {
    const birthdayThisYear = new Date(today.getFullYear(), currentMonth, c.dayOfMonth);
    return isWithinInterval(birthdayThisYear, {
      start: today,
      end: addDays(today, 7),
    });
  }) || [];

  const totalBirthdays = birthdayClients?.length || 0;
  const couponsUsed = birthdayClients?.filter(c => c.couponUsed).length || 0;

  if (isLoading || loadingSettings) {
    return (
      <div className="animate-fade-in">
        <SegmentCard
          icon={Cake}
          iconColor="text-pink-500"
          title="Aniversariantes do Mês"
          count={0}
          subtitle="Carregando..."
          actionLabel="Ver lista"
          className="[animation-delay:600ms]"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in [animation-delay:600ms]">
      {/* Birthday Summary Card */}
      <SegmentCard
        icon={Cake}
        iconColor="text-pink-500"
        title="Aniversariantes do Mês"
        count={totalBirthdays}
        subtitle={
          todayBirthdays.length > 0
            ? `🎉 ${todayBirthdays.length} aniversariante(s) hoje!`
            : thisWeekBirthdays.length > 0
            ? `${thisWeekBirthdays.length} nesta semana`
            : "Nenhum esta semana"
        }
        actionLabel={expanded ? "Esconder lista" : "Ver lista"}
        onAction={() => setExpanded(!expanded)}
        className="border-pink-500/20"
      />

      {/* Expanded Birthday List */}
      {expanded && (
        <div className="glass rounded-xl p-5 animate-slide-up border-pink-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-pink-500" />
              <div>
                <h3 className="font-display font-semibold text-foreground">
                  Aniversariantes de {format(today, "MMMM", { locale: ptBR })}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {couponsUsed} de {totalBirthdays} cupons utilizados
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={openSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </div>

          {settings?.enabled === false && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning">
                ⚠️ Os cupons de aniversário estão desativados. Ative nas configurações.
              </p>
            </div>
          )}

          {totalBirthdays === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Cake className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum cliente faz aniversário este mês.</p>
              <p className="text-sm mt-1">
                Certifique-se de coletar a data de nascimento dos clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {birthdayClients?.map((client) => {
                const isToday = client.dayOfMonth === currentDay;
                const isPast = client.dayOfMonth < currentDay;
                const birthdayThisYear = new Date(today.getFullYear(), currentMonth, client.dayOfMonth);
                
                return (
                  <div
                    key={client.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isToday
                        ? "bg-pink-500/10 border-pink-500/30"
                        : isPast
                        ? "bg-muted/30 border-border"
                        : "bg-card border-border hover:border-pink-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isToday ? "bg-pink-500 text-white" : "bg-muted"
                        }`}>
                          <Cake className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground flex items-center gap-2">
                            {client.name}
                            {isToday && (
                              <Badge className="bg-pink-500 text-white text-xs">
                                Hoje! 🎂
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(birthdayThisYear, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {client.hasCoupon ? (
                          <Badge variant={client.couponUsed ? "secondary" : "outline"} className="text-xs">
                            {client.couponUsed ? "Cupom usado" : "Cupom enviado"}
                          </Badge>
                        ) : settings?.enabled ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => createCouponMutation.mutate(client)}
                            disabled={createCouponMutation.isPending}
                            className="text-pink-500 border-pink-500/30 hover:bg-pink-500/10"
                          >
                            <Gift className="h-4 w-4 mr-1" />
                            Criar Cupom
                          </Button>
                        ) : null}
                        <WhatsAppButton 
                          phone={client.phone} 
                          name={client.name}
                          message={formatBirthdayMessage(
                            settings?.message_template || DEFAULT_MESSAGE,
                            client,
                            settings
                          )}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Configurações de Aniversário
            </DialogTitle>
            <DialogDescription>
              Configure o desconto automático para aniversariantes
            </DialogDescription>
          </DialogHeader>

          {localSettings && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Ativar cupons de aniversário</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir criar cupons de desconto para aniversariantes
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={localSettings.enabled}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, enabled: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Desconto padrão (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min={1}
                  max={100}
                  value={localSettings.default_discount_percentage}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      default_discount_percentage: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="days_before">Dias antes</Label>
                  <Input
                    id="days_before"
                    type="number"
                    min={0}
                    max={30}
                    value={localSettings.days_before}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        days_before: Number(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Validade antes do aniversário
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days_after">Dias depois</Label>
                  <Input
                    id="days_after"
                    type="number"
                    min={0}
                    max={30}
                    value={localSettings.days_after}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        days_after: Number(e.target.value),
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Validade após o aniversário
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_create">Criação automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Criar cupons automaticamente no início do mês
                  </p>
                </div>
                <Switch
                  id="auto_create"
                  checked={localSettings.auto_create_coupon}
                  onCheckedChange={(checked) =>
                    setLocalSettings({ ...localSettings, auto_create_coupon: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message_template" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Mensagem de WhatsApp
                </Label>
                <Textarea
                  id="message_template"
                  rows={4}
                  value={localSettings.message_template || DEFAULT_MESSAGE}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      message_template: e.target.value,
                    })
                  }
                  placeholder="Digite a mensagem para o cliente..."
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Variáveis disponíveis:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li><code className="bg-muted px-1 rounded">{'{nome}'}</code> - Primeiro nome do cliente</li>
                    <li><code className="bg-muted px-1 rounded">{'{desconto}'}</code> - Porcentagem de desconto</li>
                    <li><code className="bg-muted px-1 rounded">{'{dias}'}</code> - Total de dias de validade</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={saveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  {updateSettingsMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
