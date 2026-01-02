import { useState } from "react";
import { Brain, Loader2, TrendingUp, Users, Calendar, DollarSign, Package, Scissors, Tag, Award, AlertTriangle, Sparkles, UserCog, Cake, Gift, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, format, getHours, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getMonth, getDate, addDays, isWithinInterval, eachMonthOfInterval, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StatCard } from "@/components/ui/stat-card";
import { XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { PeriodFilter, PeriodType } from "@/components/ui/period-filter";

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

export function AnalystTab() {
  const now = new Date();
  const currentHour = getHours(now);
  
  // Period filter state
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(now));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(now));
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  
  // Calculate comparison period (same duration before the selected period)
  const periodDuration = periodEnd.getTime() - periodStart.getTime();
  const comparisonStart = new Date(periodStart.getTime() - periodDuration);
  const comparisonEnd = new Date(periodEnd.getTime() - periodDuration);
  
  const todayStart = startOfDay(now).toISOString();
  const todayEnd = endOfDay(now).toISOString();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Horário comercial: 9h às 20h
  const businessStartHour = 9;
  const businessEndHour = 20;
  const isBusinessHours = currentHour >= businessStartHour && currentHour < businessEndHour;

  const handlePeriodChange = (start: Date, end: Date, type: PeriodType) => {
    setPeriodStart(start);
    setPeriodEnd(end);
    setPeriodType(type);
  };

  // Fetch current period orders
  const { data: currentPeriodOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ["analyst-current-period", periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, status, scheduled_at, customer_id, barber_id, preferred_barber_id")
        .gte("scheduled_at", periodStart.toISOString())
        .lte("scheduled_at", periodEnd.toISOString());

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch comparison period orders
  const { data: comparisonPeriodOrders } = useQuery({
    queryKey: ["analyst-comparison-period", comparisonStart.toISOString(), comparisonEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_price, status")
        .gte("scheduled_at", comparisonStart.toISOString())
        .lte("scheduled_at", comparisonEnd.toISOString())
        .eq("status", "completed");

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch week orders for chart
  const { data: weekOrders } = useQuery({
    queryKey: ["analyst-week-orders", currentWeekStart.toISOString(), currentWeekEnd.toISOString()],
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

  // Fetch today's orders
  const { data: todayOrders } = useQuery({
    queryKey: ["analyst-today", todayStart, todayEnd],
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
    queryKey: ["analyst-order-items", periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const completedOrderIds = currentPeriodOrders
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
    enabled: !!currentPeriodOrders,
    staleTime: 60000,
  });

  // Fetch order products for product ranking
  const { data: orderProducts } = useQuery({
    queryKey: ["analyst-order-products", periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const completedOrderIds = currentPeriodOrders
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
    enabled: !!currentPeriodOrders,
    staleTime: 60000,
  });

  // Fetch services for names
  const { data: services } = useQuery({
    queryKey: ["analyst-services"],
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
    queryKey: ["analyst-products"],
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
    queryKey: ["analyst-combos"],
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
    queryKey: ["analyst-customers-count"],
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
    queryKey: ["analyst-promotions"],
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

  // Fetch barbers
  const { data: barbers } = useQuery({
    queryKey: ["analyst-barbers"],
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

  // Fetch birthday clients for current month
  const { data: birthdayData } = useQuery({
    queryKey: ["analyst-birthdays", getMonth(now)],
    queryFn: async () => {
      const currentMonth = getMonth(now);
      const currentDay = getDate(now);
      
      // Get all customer user_ids
      const { data: customerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      if (!customerRoles?.length) return { total: 0, today: 0, thisWeek: 0 };

      const customerIds = customerRoles.map(r => r.user_id);

      // Get profiles with birth_date
      const { data: profiles } = await supabase
        .from("profiles")
        .select("birth_date")
        .in("user_id", customerIds)
        .not("birth_date", "is", null);

      if (!profiles?.length) return { total: 0, today: 0, thisWeek: 0 };

      // Filter clients with birthday this month
      const birthdayClients = profiles.filter(p => {
        const birthDate = new Date(p.birth_date!);
        return getMonth(birthDate) === currentMonth;
      });

      const todayBirthdays = birthdayClients.filter(p => {
        const birthDate = new Date(p.birth_date!);
        return getDate(birthDate) === currentDay;
      });

      const thisWeekBirthdays = birthdayClients.filter(p => {
        const birthDate = new Date(p.birth_date!);
        const birthdayThisYear = new Date(now.getFullYear(), currentMonth, getDate(birthDate));
        return isWithinInterval(birthdayThisYear, {
          start: now,
          end: addDays(now, 7),
        });
      });

      return {
        total: birthdayClients.length,
        today: todayBirthdays.length,
        thisWeek: thisWeekBirthdays.length,
      };
    },
    staleTime: 60000,
  });

  // Fetch birthday coupons for the selected period
  const { data: birthdayCoupons } = useQuery({
    queryKey: ["analyst-birthday-coupons", periodStart.toISOString(), periodEnd.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("birthday_coupons")
        .select("*")
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString());

      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  // Fetch all birthday coupons for monthly evolution (current year)
  const { data: allBirthdayCoupons } = useQuery({
    queryKey: ["analyst-all-birthday-coupons", now.getFullYear()],
    queryFn: async () => {
      const yearStart = startOfYear(now);
      const { data, error } = await supabase
        .from("birthday_coupons")
        .select("*")
        .gte("created_at", yearStart.toISOString());

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

  // Calculate metrics
  const completedOrders = currentPeriodOrders?.filter(o => o.status === "completed") || [];
  const cancelledOrders = currentPeriodOrders?.filter(o => o.status === "cancelled") || [];
  const currentRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const comparisonRevenue = comparisonPeriodOrders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
  
  const revenueChange = comparisonRevenue > 0 
    ? Math.round(((currentRevenue - comparisonRevenue) / comparisonRevenue) * 100) 
    : 0;

  const currentPeriodCount = completedOrders.length;
  const comparisonPeriodCount = comparisonPeriodOrders?.length || 0;
  const countChange = comparisonPeriodCount > 0 
    ? Math.round(((currentPeriodCount - comparisonPeriodCount) / comparisonPeriodCount) * 100) 
    : 0;

  const ticketMedio = currentPeriodCount > 0 ? currentRevenue / currentPeriodCount : 0;
  const comparisonTicketMedio = comparisonPeriodCount > 0 ? comparisonRevenue / comparisonPeriodCount : 0;
  const ticketChange = comparisonTicketMedio > 0 
    ? Math.round(((ticketMedio - comparisonTicketMedio) / comparisonTicketMedio) * 100) 
    : 0;

  const todayPending = todayOrders?.filter(o => o.status === "pending" || o.status === "confirmed").length || 0;
  const todayCompleted = todayOrders?.filter(o => o.status === "completed").length || 0;
  const todayCancelled = todayOrders?.filter(o => o.status === "cancelled").length || 0;
  const cancelRate = currentPeriodOrders?.length 
    ? Math.round((cancelledOrders.length / currentPeriodOrders.length) * 100) 
    : 0;

  // Calcular slots restantes apenas se estiver em horário comercial
  const remainingHours = isBusinessHours ? businessEndHour - currentHour : 0;
  const slotsPerHour = 2;
  const maxRemainingSlots = remainingHours * slotsPerHour;
  
  const futureAppointmentsToday = todayOrders?.filter(o => {
    if (!o.scheduled_at) return false;
    const scheduledHour = getHours(new Date(o.scheduled_at));
    return scheduledHour >= currentHour && (o.status === "pending" || o.status === "confirmed");
  }).length || 0;

  const freeSlots = Math.max(0, maxRemainingSlots - futureAppointmentsToday);

  // Birthday coupon conversion metrics
  const totalCouponsCreated = birthdayCoupons?.length || 0;
  const totalCouponsUsed = birthdayCoupons?.filter(c => c.used).length || 0;
  const birthdayConversionRate = totalCouponsCreated > 0 
    ? Math.round((totalCouponsUsed / totalCouponsCreated) * 100) 
    : 0;
  const totalDiscountApplied = birthdayCoupons
    ?.filter(c => c.used && c.discount_value)
    ?.reduce((sum, c) => sum + (c.discount_value || 0), 0) || 0;

  // Generate monthly birthday coupon evolution data
  const monthsOfYear = eachMonthOfInterval({ start: startOfYear(now), end: now });
  const birthdayEvolutionData = monthsOfYear.map(month => {
    const monthIndex = getMonth(month);
    const monthCoupons = allBirthdayCoupons?.filter(c => {
      const createdDate = new Date(c.created_at);
      return getMonth(createdDate) === monthIndex;
    }) || [];
    
    const created = monthCoupons.length;
    const used = monthCoupons.filter(c => c.used).length;
    
    return {
      month: format(month, "MMM", { locale: ptBR }),
      criados: created,
      usados: used,
    };
  });

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

  // Calculate barber performance
  const barberPerformance = barbers?.map(barber => {
    const barberOrders = completedOrders.filter(o => 
      (o.barber_id === barber.id) || (!o.barber_id && o.preferred_barber_id === barber.id)
    );
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

  // Generate AI insights
  const insights = [];

  // Insight sobre horários
  if (isBusinessHours && freeSlots > 0) {
    insights.push({
      type: "slots",
      icon: Calendar,
      priority: 1,
      message: `Você tem ${freeSlots} horários disponíveis até as ${businessEndHour}h. ${freeSlots > 3 ? "Considere entrar em contato com clientes para preencher a agenda." : "Agenda quase completa!"}`,
      time: "Agora",
    });
  } else if (!isBusinessHours) {
    if (currentHour < businessStartHour) {
      insights.push({
        type: "info",
        icon: Calendar,
        priority: 1,
        message: `Bom dia! O expediente começa às ${businessStartHour}h. Você tem ${todayPending} agendamentos para hoje.`,
        time: "Agora",
      });
    } else {
      insights.push({
        type: "info",
        icon: Calendar,
        priority: 1,
        message: `Expediente encerrado. Hoje você teve ${todayCompleted} atendimentos${todayCancelled > 0 ? ` e ${todayCancelled} cancelamentos` : ""}.`,
        time: "Agora",
      });
    }
  }

  // Insight sobre faturamento
  if (comparisonRevenue > 0 && revenueChange !== 0) {
    insights.push({
      type: "revenue",
      icon: revenueChange > 0 ? TrendingUp : AlertTriangle,
      priority: 2,
      message: revenueChange > 0 
        ? `📈 Ótimo! Faturamento no período está ${revenueChange}% acima do período anterior. Continue assim!`
        : `⚠️ Faturamento ${Math.abs(revenueChange)}% abaixo do período anterior. Considere criar promoções ou combos atrativos.`,
      time: "Período selecionado",
    });
  }

  // Insight sobre serviço mais popular
  if (serviceRanking.length > 0) {
    const topService = serviceRanking[0];
    insights.push({
      type: "service",
      icon: Scissors,
      priority: 3,
      message: `🏆 "${topService.name}" é seu serviço campeão com ${topService.count} realizações e R$ ${topService.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} em faturamento.`,
      time: "Período selecionado",
    });
  }

  // Insight sobre produto mais vendido
  if (productRanking.length > 0) {
    const topProduct = productRanking[0];
    insights.push({
      type: "product",
      icon: Package,
      priority: 4,
      message: `📦 "${topProduct.name}" é seu produto mais vendido: ${topProduct.count} unidades (R$ ${topProduct.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}).`,
      time: "Período selecionado",
    });
  } else if (products && products.length > 0 && completedOrders.length > 0) {
    insights.push({
      type: "product",
      icon: Package,
      priority: 4,
      message: "💡 Nenhum produto vendido no período. Ofereça produtos durante os atendimentos para aumentar o ticket médio!",
      time: "Sugestão",
    });
  }

  // Insight sobre combo mais usado
  if (comboRanking.length > 0) {
    const topCombo = comboRanking[0];
    insights.push({
      type: "combo",
      icon: Tag,
      priority: 5,
      message: `🎯 O combo "${topCombo.name}" foi resgatado ${topCombo.redemptions}x, gerando R$ ${topCombo.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}.`,
      time: "Total",
    });
  } else if (combos && combos.length === 0) {
    insights.push({
      type: "combo",
      icon: Tag,
      priority: 5,
      message: "💡 Você não tem combos cadastrados. Combos incentivam clientes a experimentar mais serviços!",
      time: "Sugestão",
    });
  }

  // Insight sobre taxa de cancelamento
  if (cancelRate > 10) {
    insights.push({
      type: "cancel",
      icon: AlertTriangle,
      priority: 2,
      message: `⚠️ Taxa de cancelamento em ${cancelRate}%. Confirme agendamentos com antecedência via WhatsApp.`,
      time: "Período selecionado",
    });
  }

  // Insight sobre promoções
  if (promotions?.length === 0) {
    insights.push({
      type: "promotion",
      icon: Award,
      priority: 6,
      message: "💡 Nenhuma promoção ativa. Promoções podem atrair clientes em dias mais vazios!",
      time: "Sugestão",
    });
  }

  // Ticket médio insight
  if (ticketMedio > 0 && comparisonPeriodOrders && comparisonPeriodOrders.length > 0 && Math.abs(ticketChange) > 5) {
    insights.push({
      type: "ticket",
      icon: DollarSign,
      priority: 3,
      message: ticketChange > 0
        ? `📊 Ticket médio subiu ${ticketChange}% (R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}). Excelente!`
        : `📊 Ticket médio caiu ${Math.abs(ticketChange)}%. Ofereça serviços complementares ou produtos.`,
      time: "Período selecionado",
    });
  }

  // Birthday insight
  if (birthdayData) {
    if (birthdayData.today > 0) {
      insights.push({
        type: "birthday",
        icon: Cake,
        priority: 1,
        message: `🎂 ${birthdayData.today} cliente${birthdayData.today > 1 ? "s fazem" : " faz"} aniversário HOJE! Entre em contato para parabenizar e oferecer desconto especial.`,
        time: "Agora",
      });
    } else if (birthdayData.thisWeek > 0) {
      insights.push({
        type: "birthday",
        icon: Cake,
        priority: 4,
        message: `🎂 ${birthdayData.thisWeek} cliente${birthdayData.thisWeek > 1 ? "s fazem" : " faz"} aniversário esta semana. Envie mensagens de parabéns e cupons de desconto!`,
        time: "Esta semana",
      });
    } else if (birthdayData.total > 0) {
      insights.push({
        type: "birthday",
        icon: Cake,
        priority: 6,
        message: `🎂 ${birthdayData.total} cliente${birthdayData.total > 1 ? "s fazem" : " faz"} aniversário este mês. Aproveite para criar campanhas de fidelização!`,
        time: "Este mês",
      });
    }
  }

  // Sort insights by priority
  insights.sort((a, b) => a.priority - b.priority);

  // Get period label for display
  const getPeriodLabel = () => {
    return `${format(periodStart, "dd/MM/yyyy", { locale: ptBR })} - ${format(periodEnd, "dd/MM/yyyy", { locale: ptBR })}`;
  };

  if (isLoadingOrders) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header with Period Filter */}
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-gold p-3">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Analista Barber</h2>
              <p className="text-muted-foreground">
                {format(now, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          
          <PeriodFilter onPeriodChange={handlePeriodChange} />
        </div>
        
        {/* Period indicator */}
        <div className="mt-3 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 inline-block">
          Período: {getPeriodLabel()}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento"
          value={`R$ ${currentRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
          trend={revenueChange !== 0 ? { value: `${revenueChange > 0 ? "+" : ""}${revenueChange}%`, isPositive: revenueChange > 0 } : undefined}
          subtitle="vs período anterior"
          className="[animation-delay:100ms]"
        />
        
        <StatCard
          title="Ticket Médio"
          value={`R$ ${ticketMedio.toFixed(2)}`}
          icon={TrendingUp}
          trend={ticketChange !== 0 ? { value: `${ticketChange > 0 ? "+" : ""}${ticketChange}%`, isPositive: ticketChange > 0 } : undefined}
          subtitle="vs período anterior"
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
          value={String(currentPeriodCount)}
          icon={Scissors}
          trend={countChange !== 0 ? { value: `${countChange > 0 ? "+" : ""}${countChange}%`, isPositive: countChange > 0 } : undefined}
          subtitle="vs período anterior"
          className="[animation-delay:400ms]"
        />
      </div>

      {/* AI Insights */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:500ms]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-gold p-2">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Insights Inteligentes</h3>
            <p className="text-sm text-muted-foreground">Análise baseada nos seus dados reais</p>
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

      {/* Revenue Chart */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
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
                <linearGradient id="colorRevenueAnalyst" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#colorRevenueAnalyst)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Rankings Section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Services */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:700ms]">
          <div className="flex items-center gap-2 mb-3">
            <Scissors className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Serviços</h3>
          </div>
          {serviceRanking.length > 0 ? (
            <div className="space-y-2">
              {serviceRanking.slice(0, 5).map((service, index) => (
                <div key={service.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{index + 1}</span>
                    <span className="text-foreground truncate">{service.name}</span>
                  </div>
                  <span className="text-muted-foreground">{service.count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum serviço no período</p>
          )}
        </div>

        {/* Top Products */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:800ms]">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Produtos</h3>
          </div>
          {productRanking.length > 0 ? (
            <div className="space-y-2">
              {productRanking.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{index + 1}</span>
                    <span className="text-foreground truncate">{product.name}</span>
                  </div>
                  <span className="text-muted-foreground">{product.count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum produto vendido</p>
          )}
        </div>

        {/* Top Combos */}
        <div className="glass rounded-xl p-4 animate-slide-up [animation-delay:900ms]">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Top Combos</h3>
          </div>
          {comboRanking.length > 0 ? (
            <div className="space-y-2">
              {comboRanking.slice(0, 5).map((combo, index) => (
                <div key={combo.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{index + 1}</span>
                    <span className="text-foreground truncate">{combo.name}</span>
                  </div>
                  <span className="text-muted-foreground">{combo.redemptions}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum combo utilizado</p>
          )}
        </div>
      </div>

      {/* Birthday Conversion Report */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:950ms]">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 p-2">
            <Cake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Relatório de Conversão - Aniversariantes</h3>
            <p className="text-sm text-muted-foreground">Desempenho dos cupons no período selecionado</p>
          </div>
        </div>

        {/* Conversion Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-lg border border-pink-500/20">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
              <Gift className="h-4 w-4" />
              <span className="text-xs">Cupons Criados</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{totalCouponsCreated}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">Cupons Usados</span>
            </div>
            <p className="text-3xl font-bold text-green-500">{totalCouponsUsed}</p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
              <Percent className="h-4 w-4" />
              <span className="text-xs">Taxa de Conversão</span>
            </div>
            <p className={`text-3xl font-bold ${birthdayConversionRate >= 50 ? 'text-green-500' : birthdayConversionRate >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
              {birthdayConversionRate}%
            </p>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Desconto Total</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              R$ {totalDiscountApplied.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Monthly Evolution Chart */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Evolução Mensal de Cupons ({now.getFullYear()})</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={birthdayEvolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value === 'criados' ? 'Criados' : 'Usados'}</span>}
                />
                <Bar dataKey="criados" fill="hsl(330, 80%, 60%)" radius={[4, 4, 0, 0]} name="criados" />
                <Bar dataKey="usados" fill="hsl(142, 76%, 45%)" radius={[4, 4, 0, 0]} name="usados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Barber Performance */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:1000ms]">
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-display font-semibold text-foreground">Desempenho por Barbeiro</h3>
            <p className="text-sm text-muted-foreground">Ranking do período selecionado</p>
          </div>
        </div>
        
        {barberPerformance.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum barbeiro cadastrado</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
