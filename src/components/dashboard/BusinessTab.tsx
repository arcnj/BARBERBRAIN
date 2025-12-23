import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp, Users, Scissors, Loader2 } from "lucide-react";
import { XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function BusinessTab() {
  const today = new Date();
  const currentMonthStart = startOfMonth(today).toISOString();
  const currentMonthEnd = endOfMonth(today).toISOString();
  const lastMonthStart = startOfMonth(subMonths(today, 1)).toISOString();
  const lastMonthEnd = endOfMonth(subMonths(today, 1)).toISOString();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  // Fetch current month orders
  const { data: currentMonthOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ["business-current-month", currentMonthStart, currentMonthEnd],
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
          preferred_barber_id
        `)
        .gte("scheduled_at", currentMonthStart)
        .lte("scheduled_at", currentMonthEnd)
        .eq("status", "completed");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch last month orders for comparison
  const { data: lastMonthOrders } = useQuery({
    queryKey: ["business-last-month", lastMonthStart, lastMonthEnd],
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

  // Fetch current week orders for chart
  const { data: weekOrders } = useQuery({
    queryKey: ["business-week-orders", currentWeekStart.toISOString(), currentWeekEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, scheduled_at, status")
        .gte("scheduled_at", currentWeekStart.toISOString())
        .lte("scheduled_at", currentWeekEnd.toISOString())
        .eq("status", "completed");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch services ranking
  const { data: orderItems } = useQuery({
    queryKey: ["business-order-items", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          price,
          service_id,
          services(name, price),
          order_id,
          orders!inner(status, scheduled_at)
        `)
        .gte("orders.scheduled_at", currentMonthStart)
        .lte("orders.scheduled_at", currentMonthEnd)
        .eq("orders.status", "completed");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch all customers count
  const { data: customersCount } = useQuery({
    queryKey: ["business-customers-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    staleTime: 60000,
  });

  // Fetch barbers
  const { data: barbers } = useQuery({
    queryKey: ["business-barbers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("active", true);

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Calculate stats
  const currentMonthRevenue = currentMonthOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
  const lastMonthRevenue = lastMonthOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
  const revenueChange = lastMonthRevenue > 0 
    ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
    : 0;

  const currentMonthCount = currentMonthOrders?.length || 0;
  const lastMonthCount = lastMonthOrders?.length || 0;
  const countChange = lastMonthCount > 0 
    ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100) 
    : 0;

  const ticketMedio = currentMonthCount > 0 ? currentMonthRevenue / currentMonthCount : 0;
  const lastTicketMedio = lastMonthCount > 0 ? lastMonthRevenue / lastMonthCount : 0;
  const ticketChange = lastTicketMedio > 0 
    ? Math.round(((ticketMedio - lastTicketMedio) / lastTicketMedio) * 100) 
    : 0;

  // Generate weekly chart data
  const daysOfWeek = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
  const revenueData = daysOfWeek.map(day => {
    const dayOrders = weekOrders?.filter(o => 
      isSameDay(new Date(o.scheduled_at!), day)
    ) || [];
    const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    
    return {
      day: format(day, "EEE", { locale: ptBR }).replace(".", ""),
      value: dayRevenue,
    };
  });

  // Calculate barber performance - use preferred_barber_id if barber_id is null
  const barberPerformance = barbers?.map(barber => {
    const barberOrders = currentMonthOrders?.filter(o => 
      (o.barber_id === barber.id) || (!o.barber_id && o.preferred_barber_id === barber.id)
    ) || [];
    const revenue = barberOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const clients = barberOrders.length;
    const ticket = clients > 0 ? revenue / clients : 0;

    return {
      name: barber.name,
      revenue: `R$ ${revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
      clients,
      ticket: `R$ ${ticket.toFixed(0)}`,
    };
  }).sort((a, b) => {
    const aRevenue = parseFloat(a.revenue.replace(/[^\d]/g, ""));
    const bRevenue = parseFloat(b.revenue.replace(/[^\d]/g, ""));
    return bRevenue - aRevenue;
  }) || [];

  // Calculate services ranking
  const servicesMap = new Map<string, { name: string; count: number; price: number }>();
  orderItems?.forEach((item: any) => {
    const serviceName = item.services?.name || "Serviço";
    const existing = servicesMap.get(serviceName);
    if (existing) {
      existing.count++;
    } else {
      servicesMap.set(serviceName, {
        name: serviceName,
        count: 1,
        price: Number(item.services?.price || 0),
      });
    }
  });

  const services = Array.from(servicesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s, index) => ({
      rank: index + 1,
      name: s.name,
      count: s.count,
      price: `R$ ${s.price.toFixed(0)}`,
    }));

  if (loadingOrders) {
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
        <h2 className="font-display text-2xl font-bold text-foreground">Visão do Negócio</h2>
        <p className="text-muted-foreground mt-1">Métricas e análises para decisões inteligentes</p>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Mensal"
          value={`R$ ${currentMonthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
          trend={revenueChange !== 0 ? { value: `${revenueChange > 0 ? "+" : ""}${revenueChange}%`, isPositive: revenueChange > 0 } : undefined}
          subtitle="vs mês anterior"
          className="[animation-delay:100ms]"
        />
        
        <StatCard
          title="Ticket Médio"
          value={`R$ ${ticketMedio.toFixed(2)}`}
          icon={TrendingUp}
          trend={ticketChange !== 0 ? { value: `${ticketChange > 0 ? "+" : ""}${ticketChange}%`, isPositive: ticketChange > 0 } : undefined}
          subtitle="vs mês anterior"
          className="[animation-delay:200ms]"
        />
        
        <StatCard
          title="Total de Clientes"
          value={String(customersCount || 0)}
          icon={Users}
          subtitle="cadastrados"
          className="[animation-delay:300ms]"
        />
        
        <StatCard
          title="Atendimentos"
          value={String(currentMonthCount)}
          icon={Scissors}
          trend={countChange !== 0 ? { value: `${countChange > 0 ? "+" : ""}${countChange}%`, isPositive: countChange > 0 } : undefined}
          subtitle="vs mês anterior"
          className="[animation-delay:400ms]"
        />
      </div>
      
      {/* Revenue Chart */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:500ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Faturamento Semanal</h3>
            <p className="text-sm text-muted-foreground">Esta semana</p>
          </div>
        </div>
        
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickFormatter={(value) => value >= 1000 ? `R$${(value/1000).toFixed(0)}k` : `R$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Barbers Performance */}
        <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-foreground">Desempenho por Barbeiro</h3>
            <p className="text-sm text-muted-foreground">Ranking do mês</p>
          </div>
          
          {barberPerformance.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum barbeiro cadastrado</p>
          ) : (
            <div className="space-y-4">
              {barberPerformance.map((barber, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-display font-bold">
                    {barber.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{barber.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{barber.clients} clientes</span>
                      <span>•</span>
                      <span>Ticket: {barber.ticket}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-display font-bold text-foreground">{barber.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Services Ranking */}
        <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:700ms]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-foreground">Ranking de Serviços</h3>
            <p className="text-sm text-muted-foreground">Mais realizados este mês</p>
          </div>
          
          {services.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum serviço realizado este mês</p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div 
                  key={service.rank} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    service.rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {service.rank}
                  </span>
                  
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.count}x realizados</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-display font-bold text-foreground">{service.price}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
