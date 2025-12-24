import { Brain, Loader2, TrendingUp, Users, Calendar, DollarSign, Package, Scissors, Tag, Award, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, format, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ServiceRanking {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

interface ProductRanking {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

interface ComboRanking {
  id: string;
  name: string;
  redemptions: number;
  revenue: number;
}

export function SuggestionsTab() {
  const now = new Date();
  const currentHour = getHours(now);
  const currentMonthStart = startOfMonth(now).toISOString();
  const currentMonthEnd = endOfMonth(now).toISOString();
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();

  // Horário comercial: 9h às 20h
  const businessStartHour = 9;
  const businessEndHour = 20;
  const isBusinessHours = currentHour >= businessStartHour && currentHour < businessEndHour;

  // Fetch current month orders with items
  const { data: currentMonthOrders, isLoading: isLoadingOrders } = useQuery({
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

  // Fetch order items for service ranking
  const { data: orderItems } = useQuery({
    queryKey: ["suggestions-order-items", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const completedOrderIds = currentMonthOrders
        ?.filter(o => o.status === "completed")
        .map(o => o.id) || [];

      if (completedOrderIds.length === 0) return [];

      const { data, error } = await supabase
        .from("order_items")
        .select("service_id, price")
        .in("order_id", completedOrderIds);

      if (error) throw error;
      return data;
    },
    enabled: !!currentMonthOrders,
    staleTime: 60000,
  });

  // Fetch order products for product ranking
  const { data: orderProducts } = useQuery({
    queryKey: ["suggestions-order-products", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const completedOrderIds = currentMonthOrders
        ?.filter(o => o.status === "completed")
        .map(o => o.id) || [];

      if (completedOrderIds.length === 0) return [];

      const { data, error } = await supabase
        .from("order_products")
        .select("product_id, price, quantity")
        .in("order_id", completedOrderIds);

      if (error) throw error;
      return data;
    },
    enabled: !!currentMonthOrders,
    staleTime: 60000,
  });

  // Fetch services for names
  const { data: services } = useQuery({
    queryKey: ["suggestions-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price");

      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  // Fetch products for names
  const { data: products } = useQuery({
    queryKey: ["suggestions-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price");

      if (error) throw error;
      return data;
    },
    staleTime: 300000,
  });

  // Fetch combos with redemptions
  const { data: combos } = useQuery({
    queryKey: ["suggestions-combos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_combos")
        .select("id, name, promotional_price, current_redemptions")
        .eq("active", true);

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
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

  // Calculate service ranking
  const serviceRanking: ServiceRanking[] = [];
  if (orderItems && services) {
    const serviceStats: Record<string, { count: number; revenue: number }> = {};
    
    orderItems.forEach(item => {
      if (!serviceStats[item.service_id]) {
        serviceStats[item.service_id] = { count: 0, revenue: 0 };
      }
      serviceStats[item.service_id].count++;
      serviceStats[item.service_id].revenue += Number(item.price || 0);
    });

    Object.entries(serviceStats).forEach(([serviceId, stats]) => {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        serviceRanking.push({
          id: serviceId,
          name: service.name,
          count: stats.count,
          revenue: stats.revenue,
        });
      }
    });

    serviceRanking.sort((a, b) => b.count - a.count);
  }

  // Calculate product ranking
  const productRanking: ProductRanking[] = [];
  if (orderProducts && products) {
    const productStats: Record<string, { count: number; revenue: number }> = {};
    
    orderProducts.forEach(item => {
      if (!productStats[item.product_id]) {
        productStats[item.product_id] = { count: 0, revenue: 0 };
      }
      productStats[item.product_id].count += item.quantity;
      productStats[item.product_id].revenue += Number(item.price || 0) * item.quantity;
    });

    Object.entries(productStats).forEach(([productId, stats]) => {
      const product = products.find(p => p.id === productId);
      if (product) {
        productRanking.push({
          id: productId,
          name: product.name,
          count: stats.count,
          revenue: stats.revenue,
        });
      }
    });

    productRanking.sort((a, b) => b.count - a.count);
  }

  // Calculate combo ranking
  const comboRanking: ComboRanking[] = (combos || [])
    .filter(c => c.current_redemptions > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      redemptions: c.current_redemptions,
      revenue: c.current_redemptions * Number(c.promotional_price || 0),
    }))
    .sort((a, b) => b.redemptions - a.redemptions);

  // Calculate insights
  const completedOrders = currentMonthOrders?.filter(o => o.status === "completed") || [];
  const cancelledOrders = currentMonthOrders?.filter(o => o.status === "cancelled") || [];
  const currentRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const lastMonthRevenue = lastMonthOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
  
  const revenueChange = lastMonthRevenue > 0 
    ? Math.round(((currentRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
    : 0;

  const todayPending = todayOrders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0;
  const todayCompleted = todayOrders?.filter(o => o.status === "completed").length || 0;
  const todayCancelled = todayOrders?.filter(o => o.status === "cancelled").length || 0;
  const cancelRate = currentMonthOrders?.length 
    ? Math.round((cancelledOrders.length / currentMonthOrders.length) * 100) 
    : 0;

  // Calcular slots restantes apenas se estiver em horário comercial
  const remainingHours = isBusinessHours ? businessEndHour - currentHour : 0;
  const slotsPerHour = 2; // 30 min cada
  const maxRemainingSlots = remainingHours * slotsPerHour;
  
  // Pegar agendamentos futuros de hoje (após a hora atual)
  const futureAppointmentsToday = todayOrders?.filter(o => {
    if (!o.scheduled_at) return false;
    const scheduledHour = getHours(new Date(o.scheduled_at));
    return scheduledHour >= currentHour && (o.status === "pending" || o.status === "confirmed");
  }).length || 0;

  const freeSlots = Math.max(0, maxRemainingSlots - futureAppointmentsToday);

  // Generate dynamic insights
  const insights = [];

  // Insight sobre horários - só mostra se estiver em horário comercial e houver slots livres
  if (isBusinessHours && freeSlots > 0) {
    insights.push({
      type: "slots",
      icon: Calendar,
      message: `Você tem ${freeSlots} horários disponíveis até as ${businessEndHour}h. ${freeSlots > 3 ? "Considere entrar em contato com clientes para preencher a agenda." : "Agenda quase completa!"}`,
      time: "Agora",
    });
  } else if (!isBusinessHours) {
    if (currentHour < businessStartHour) {
      insights.push({
        type: "info",
        icon: Calendar,
        message: `Bom dia! O expediente começa às ${businessStartHour}h. Você tem ${todayPending} agendamentos para hoje.`,
        time: "Agora",
      });
    } else {
      insights.push({
        type: "info",
        icon: Calendar,
        message: `Expediente encerrado. Hoje você teve ${todayCompleted} atendimentos${todayCancelled > 0 ? ` e ${todayCancelled} cancelamentos` : ""}.`,
        time: "Agora",
      });
    }
  }

  // Insight sobre faturamento
  if (lastMonthRevenue > 0 && revenueChange !== 0) {
    insights.push({
      type: "revenue",
      icon: revenueChange > 0 ? TrendingUp : AlertTriangle,
      message: revenueChange > 0 
        ? `📈 Ótimo! Faturamento este mês está ${revenueChange}% acima do mês passado. Continue assim!`
        : `⚠️ Faturamento ${Math.abs(revenueChange)}% abaixo do mês passado. Considere criar promoções ou combos atrativos.`,
      time: "Este mês",
    });
  }

  // Insight sobre serviço mais popular
  if (serviceRanking.length > 0) {
    const topService = serviceRanking[0];
    insights.push({
      type: "service",
      icon: Scissors,
      message: `🏆 "${topService.name}" é seu serviço campeão com ${topService.count} realizações e R$ ${topService.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em faturamento.`,
      time: "Este mês",
    });
  }

  // Insight sobre produto mais vendido
  if (productRanking.length > 0) {
    const topProduct = productRanking[0];
    insights.push({
      type: "product",
      icon: Package,
      message: `📦 "${topProduct.name}" é seu produto mais vendido: ${topProduct.count} unidades (R$ ${topProduct.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}).`,
      time: "Este mês",
    });
  } else if (products && products.length > 0 && completedOrders.length > 0) {
    insights.push({
      type: "product",
      icon: Package,
      message: "💡 Nenhum produto vendido este mês. Ofereça produtos durante os atendimentos para aumentar o ticket médio!",
      time: "Sugestão",
    });
  }

  // Insight sobre combo mais usado
  if (comboRanking.length > 0) {
    const topCombo = comboRanking[0];
    insights.push({
      type: "combo",
      icon: Tag,
      message: `🎯 O combo "${topCombo.name}" foi resgatado ${topCombo.redemptions}x, gerando R$ ${topCombo.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}.`,
      time: "Total",
    });
  } else if (combos && combos.length === 0) {
    insights.push({
      type: "combo",
      icon: Tag,
      message: "💡 Você não tem combos cadastrados. Combos incentivam clientes a experimentar mais serviços!",
      time: "Sugestão",
    });
  }

  // Insight sobre taxa de cancelamento
  if (cancelRate > 10) {
    insights.push({
      type: "cancel",
      icon: AlertTriangle,
      message: `⚠️ Taxa de cancelamento em ${cancelRate}%. Confirme agendamentos com antecedência via WhatsApp.`,
      time: "Este mês",
    });
  }

  // Insight sobre promoções
  if (promotions?.length === 0) {
    insights.push({
      type: "promotion",
      icon: Award,
      message: "💡 Nenhuma promoção ativa. Promoções podem atrair clientes em dias mais vazios!",
      time: "Sugestão",
    });
  }

  // Ticket médio
  const avgTicket = completedOrders.length > 0 
    ? currentRevenue / completedOrders.length 
    : 0;
  
  if (avgTicket > 0 && lastMonthOrders && lastMonthOrders.length > 0) {
    const lastAvgTicket = lastMonthRevenue / lastMonthOrders.length;
    const ticketChange = Math.round(((avgTicket - lastAvgTicket) / lastAvgTicket) * 100);
    
    if (Math.abs(ticketChange) > 5) {
      insights.push({
        type: "ticket",
        icon: DollarSign,
        message: ticketChange > 0
          ? `📊 Ticket médio subiu ${ticketChange}% (R$ ${avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}). Excelente!`
          : `📊 Ticket médio caiu ${Math.abs(ticketChange)}%. Ofereça serviços complementares ou produtos.`,
        time: "Este mês",
      });
    }
  }

  const isLoading = isLoadingOrders;

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
        <h2 className="font-display text-2xl font-bold text-foreground">I.A. Coach</h2>
        <p className="text-muted-foreground mt-1">
          Análises em tempo real • {format(now, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
      
      {/* AI Messages */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:100ms]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-gold p-2">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Insights do Negócio</h3>
            <p className="text-sm text-muted-foreground">Baseado nos seus dados reais</p>
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

      {/* Rankings Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Services */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:200ms]">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Serviços</h3>
          </div>
          {serviceRanking.length > 0 ? (
            <div className="space-y-2">
              {serviceRanking.slice(0, 5).map((service, index) => (
                <div key={service.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}º</span>
                    <span className="text-foreground truncate">{service.name}</span>
                  </div>
                  <span className="text-muted-foreground">{service.count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum serviço realizado este mês</p>
          )}
        </div>

        {/* Top Products */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:300ms]">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Produtos</h3>
          </div>
          {productRanking.length > 0 ? (
            <div className="space-y-2">
              {productRanking.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}º</span>
                    <span className="text-foreground truncate">{product.name}</span>
                  </div>
                  <span className="text-muted-foreground">{product.count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum produto vendido este mês</p>
          )}
        </div>

        {/* Top Combos */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:400ms]">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Combos</h3>
          </div>
          {comboRanking.length > 0 ? (
            <div className="space-y-2">
              {comboRanking.slice(0, 5).map((combo, index) => (
                <div key={combo.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{index + 1}º</span>
                    <span className="text-foreground truncate">{combo.name}</span>
                  </div>
                  <span className="text-muted-foreground">{combo.redemptions}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum combo resgatado</p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:500ms]">
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

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:600ms]">
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

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:700ms]">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">
                R$ {avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Ticket médio</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:800ms]">
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
