import { Brain, Loader2, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, subDays, startOfDay, endOfDay } from "date-fns";

export function SuggestionsTab() {
  const today = new Date();
  const currentMonthStart = startOfMonth(today).toISOString();
  const currentMonthEnd = endOfMonth(today).toISOString();
  const lastMonthStart = startOfMonth(subMonths(today, 1)).toISOString();
  const lastMonthEnd = endOfMonth(subMonths(today, 1)).toISOString();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  // Fetch current month orders
  const { data: currentMonthOrders, isLoading } = useQuery({
    queryKey: ["suggestions-current-month", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, status, scheduled_at, customer_id")
        .gte("scheduled_at", currentMonthStart)
        .lte("scheduled_at", currentMonthEnd);

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch last month orders
  const { data: lastMonthOrders } = useQuery({
    queryKey: ["suggestions-last-month", lastMonthStart, lastMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, status")
        .gte("scheduled_at", lastMonthStart)
        .lte("scheduled_at", lastMonthEnd)
        .eq("status", "completed");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch today's orders
  const { data: todayOrders } = useQuery({
    queryKey: ["suggestions-today", todayStart, todayEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, scheduled_at")
        .gte("scheduled_at", todayStart)
        .lte("scheduled_at", todayEnd);

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  // Fetch total customers
  const { data: customersCount } = useQuery({
    queryKey: ["suggestions-customers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000,
  });

  // Fetch active promotions
  const { data: promotions } = useQuery({
    queryKey: ["suggestions-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("id, title")
        .eq("active", true);

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Calculate insights
  const completedOrders = currentMonthOrders?.filter(o => o.status === "completed") || [];
  const cancelledOrders = currentMonthOrders?.filter(o => o.status === "cancelled") || [];
  const currentRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const lastMonthRevenue = lastMonthOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
  
  const revenueChange = lastMonthRevenue > 0 
    ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
    : 0;

  const todayPending = todayOrders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0;
  const todayCancelled = todayOrders?.filter(o => o.status === "cancelled").length || 0;
  const cancelRate = currentMonthOrders?.length 
    ? Math.round((cancelledOrders.length / currentMonthOrders.length) * 100) 
    : 0;

  // Business hours slots (9h-20h = 22 slots of 30min)
  const totalDailySlots = 22;
  const freeSlots = totalDailySlots - todayPending;

  // Generate dynamic insights
  const insights = [];

  if (freeSlots > 5) {
    insights.push({
      type: "slots",
      icon: Calendar,
      message: `Você ainda tem ${freeSlots} horários vagos hoje. Considere entrar em contato com clientes para preencher a agenda.`,
      time: "Agora",
    });
  }

  if (revenueChange !== 0) {
    insights.push({
      type: "revenue",
      icon: revenueChange > 0 ? TrendingUp : DollarSign,
      message: revenueChange > 0 
        ? `📈 Ótimo! Faturamento este mês está ${revenueChange}% acima do mês passado. Continue assim!`
        : `⚠️ Faturamento este mês está ${Math.abs(revenueChange)}% abaixo do mês passado. Que tal criar uma promoção?`,
      time: "Este mês",
    });
  }

  if (cancelRate > 10) {
    insights.push({
      type: "cancel",
      icon: Users,
      message: `Taxa de cancelamento está em ${cancelRate}%. Considere confirmar agendamentos com antecedência.`,
      time: "Este mês",
    });
  }

  if (promotions?.length === 0) {
    insights.push({
      type: "promotion",
      icon: DollarSign,
      message: "Nenhuma promoção ativa no momento. Criar promoções pode atrair mais clientes!",
      time: "Sugestão",
    });
  }

  if (customersCount && customersCount > 0 && completedOrders.length === 0) {
    insights.push({
      type: "customers",
      icon: Users,
      message: `Você tem ${customersCount} clientes cadastrados mas nenhum atendimento concluído este mês. Hora de reativar!`,
      time: "Alerta",
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "success",
      icon: TrendingUp,
      message: "✅ Tudo está funcionando bem! Continue acompanhando suas métricas.",
      time: "Agora",
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Insights</h2>
        <p className="text-muted-foreground mt-1">Análises baseadas nos dados do seu negócio</p>
      </div>
      
      {/* AI Messages */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:100ms]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-gold p-2">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Resumo do Negócio</h3>
            <p className="text-sm text-muted-foreground">Insights baseados nos seus dados</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <div key={index} className="border-l-2 border-primary/30 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">{insight.time}</p>
                </div>
                <p className="text-sm text-foreground">{insight.message}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:200ms]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                R$ {currentRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Faturamento este mês</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:300ms]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {completedOrders.length}
              </p>
              <p className="text-xs text-muted-foreground">Atendimentos este mês</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:400ms]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {todayPending}
              </p>
              <p className="text-xs text-muted-foreground">Agendamentos hoje</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:500ms]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                {customersCount || 0}
              </p>
              <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
