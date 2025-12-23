import { StatCard } from "@/components/ui/stat-card";
import { AlertCard } from "@/components/ui/alert-card";
import { DollarSign, Users, Clock, TrendingUp, UserX, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TodayTab() {
  const { user } = useAuth();
  const today = new Date();
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  // Fetch today's orders
  const { data: todayOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["today-orders", startOfToday, endOfToday],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total_price,
          status,
          scheduled_at,
          customer_id,
          barber_id,
          profiles!orders_customer_id_profiles_fkey(full_name),
          barbers(name)
        `)
        .gte("scheduled_at", startOfToday)
        .lte("scheduled_at", endOfToday)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  // Fetch last week's orders for comparison
  const lastWeekStart = startOfWeek(subDays(today, 7), { weekStartsOn: 1 }).toISOString();
  const lastWeekEnd = endOfWeek(subDays(today, 7), { weekStartsOn: 1 }).toISOString();
  
  const { data: lastWeekOrders } = useQuery({
    queryKey: ["last-week-orders", lastWeekStart, lastWeekEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, status")
        .gte("scheduled_at", lastWeekStart)
        .lte("scheduled_at", lastWeekEnd)
        .neq("status", "cancelled");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Calculate stats
  const completedOrders = todayOrders?.filter(o => o.status === "completed") || [];
  const confirmedOrders = todayOrders?.filter(o => o.status === "confirmed" || o.status === "pending") || [];
  const cancelledOrders = todayOrders?.filter(o => o.status === "cancelled") || [];
  
  const todayRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const clientsServed = completedOrders.length;
  const ticketMedio = clientsServed > 0 ? todayRevenue / clientsServed : 0;
  const noShows = cancelledOrders.length;

  // Calculate occupation rate based on business hours (9h-20h = 11 hours)
  const businessHours = 11;
  const totalSlots = businessHours * 2; // 30 min slots
  const occupiedSlots = (completedOrders.length + confirmedOrders.length);
  const occupationRate = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  // Generate occupation data by hour
  const occupancyData = Array.from({ length: 12 }, (_, i) => {
    const hour = 9 + i;
    const hourStart = new Date(today);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(today);
    hourEnd.setHours(hour + 1, 0, 0, 0);

    const ordersInHour = todayOrders?.filter(o => {
      const scheduledAt = new Date(o.scheduled_at!);
      return scheduledAt >= hourStart && scheduledAt < hourEnd && o.status !== "cancelled";
    }) || [];

    return {
      hour: `${hour}h`,
      value: ordersInHour.length > 0 ? 100 : 0,
      occupied: ordersInHour.length > 0,
    };
  });

  // Get upcoming appointments (confirmed or pending, scheduled for after now)
  const now = new Date();
  const upcomingAppointments = todayOrders
    ?.filter(o => {
      const scheduledAt = new Date(o.scheduled_at!);
      return scheduledAt > now && (o.status === "confirmed" || o.status === "pending");
    })
    .slice(0, 5) || [];

  // Get greeting based on time of day
  const hour = now.getHours();
  let greeting = "Bom dia";
  if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  if (hour >= 18) greeting = "Boa noite";

  // Get user name from profile
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const userName = profile?.full_name?.split(" ")[0] || "usuário";

  if (loadingOrders) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">{greeting}, {userName}! ☀️</h2>
        <p className="text-muted-foreground mt-1">Aqui está o resumo do seu dia</p>
      </div>
      
      {/* Alerts */}
      {confirmedOrders.length === 0 && (
        <AlertCard
          icon={Clock}
          variant="info"
          title="Sem agendamentos para hoje"
          description="Aproveite para atualizar promoções ou entrar em contato com clientes."
        />
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Hoje"
          value={`R$ ${todayRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          subtitle="Atendimentos concluídos"
          className="[animation-delay:100ms]"
        />
        
        <StatCard
          title="Clientes Atendidos"
          value={String(clientsServed)}
          icon={Users}
          subtitle={ticketMedio > 0 ? `Ticket médio: R$ ${ticketMedio.toFixed(2)}` : "Aguardando atendimentos"}
          className="[animation-delay:200ms]"
        />
        
        <StatCard
          title="Taxa de Ocupação"
          value={`${occupationRate}%`}
          icon={TrendingUp}
          subtitle={`${occupiedSlots} de ${totalSlots} horários`}
          className="[animation-delay:300ms]"
        />
        
        <StatCard
          title="Cancelamentos"
          value={String(noShows)}
          icon={UserX}
          subtitle="Hoje"
          className="[animation-delay:400ms]"
        />
      </div>
      
      {/* Occupancy Chart */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:500ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Ocupação por Horário</h3>
            <p className="text-sm text-muted-foreground">Visualize os horários livres e ocupados</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-muted-foreground">Ocupado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-muted" />
              <span className="text-muted-foreground">Livre</span>
            </div>
          </div>
        </div>
        
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={occupancyData} barSize={24}>
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {occupancyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.occupied ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Upcoming Appointments */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Próximos Atendimentos</h3>
            <p className="text-sm text-muted-foreground">Agenda de hoje</p>
          </div>
        </div>
        
        {upcomingAppointments.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Nenhum atendimento agendado para o restante do dia
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((apt: any) => (
              <div 
                key={apt.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-center min-w-[48px]">
                  <p className="font-display font-bold text-foreground">
                    {format(new Date(apt.scheduled_at), "HH:mm")}
                  </p>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {apt.profiles?.full_name || "Cliente"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    R$ {Number(apt.total_price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{apt.barbers?.name || "Sem barbeiro"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
