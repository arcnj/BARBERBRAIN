import { SegmentCard } from "@/components/ui/segment-card";
import { Trophy, AlertTriangle, UserX, Sparkles, Search, Filter, Loader2 } from "lucide-react";
import { BirthdaySection } from "./BirthdaySection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";

type ClientStatus = "VIP" | "Em Risco" | "Perdido" | "Ativo" | "Novo";

interface ClientWithMetrics {
  id: string;
  name: string;
  phone: string | null;
  status: ClientStatus;
  lastVisit: string | null;
  lastVisitDate: Date | null;
  spent: number;
  visits: number;
}

const statusColors: Record<ClientStatus, string> = {
  "VIP": "bg-primary/10 text-primary",
  "Em Risco": "bg-warning/10 text-warning",
  "Perdido": "bg-destructive/10 text-destructive",
  "Ativo": "bg-success/10 text-success",
  "Novo": "bg-blue-500/10 text-blue-500",
};

function calculateStatus(visits: number, spent: number, daysSinceLastVisit: number | null): ClientStatus {
  // VIP: 10+ visits OR spent > R$1500
  if (visits >= 10 || spent >= 1500) return "VIP";
  
  // Lost: no visit in 60+ days
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 60) return "Perdido";
  
  // At Risk: no visit in 30-59 days
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 30) return "Em Risco";
  
  // New: 1-2 visits
  if (visits <= 2) return "Novo";
  
  // Active: regular customer
  return "Ativo";
}

export function ClientsTab() {
  // Fetch customers (profiles with customer role)
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-with-orders"],
    queryFn: async () => {
      // Get all customer user_ids
      const { data: customerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      if (!customerRoles?.length) return [];

      const customerIds = customerRoles.map(r => r.user_id);

      // Get profiles for customers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", customerIds);

      // Get all completed orders
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_id, total_price, scheduled_at, status")
        .eq("status", "completed")
        .in("customer_id", customerIds);

      // Calculate metrics for each customer
      const clientsWithMetrics: ClientWithMetrics[] = (profiles || []).map(profile => {
        const customerOrders = orders?.filter(o => o.customer_id === profile.user_id) || [];
        const visits = customerOrders.length;
        const spent = customerOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
        
        // Find last visit
        const sortedOrders = [...customerOrders].sort((a, b) => 
          new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime()
        );
        const lastVisitDate = sortedOrders[0]?.scheduled_at ? new Date(sortedOrders[0].scheduled_at) : null;
        const daysSinceLastVisit = lastVisitDate 
          ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const status = calculateStatus(visits, spent, daysSinceLastVisit);

        return {
          id: profile.id,
          name: profile.full_name || "Sem nome",
          phone: profile.phone || null,
          status,
          lastVisit: lastVisitDate 
            ? formatDistanceToNow(lastVisitDate, { addSuffix: true, locale: ptBR })
            : null,
          lastVisitDate,
          spent,
          visits,
        };
      });

      return clientsWithMetrics;
    },
  });

  // Calculate segment counts
  const segments = {
    vip: customers?.filter(c => c.status === "VIP") || [],
    atRisk: customers?.filter(c => c.status === "Em Risco") || [],
    lost: customers?.filter(c => c.status === "Perdido") || [],
    new: customers?.filter(c => c.status === "Novo") || [],
    active: customers?.filter(c => c.status === "Ativo") || [],
  };

  const totalRevenue = customers?.reduce((sum, c) => sum + c.spent, 0) || 0;
  const vipRevenue = segments.vip.reduce((sum, c) => sum + c.spent, 0);
  const vipPercentage = totalRevenue > 0 ? Math.round((vipRevenue / totalRevenue) * 100) : 0;
  const atRiskRevenue = segments.atRisk.reduce((sum, c) => sum + c.spent, 0);
  const newReturned = segments.new.filter(c => c.visits >= 2).length;
  const newReturnRate = segments.new.length > 0 ? Math.round((newReturned / segments.new.length) * 100) : 0;

  // Sort by last visit (most recent first), then by spent
  const recentClients = [...(customers || [])]
    .sort((a, b) => {
      if (!a.lastVisitDate && !b.lastVisitDate) return b.spent - a.spent;
      if (!a.lastVisitDate) return 1;
      if (!b.lastVisitDate) return -1;
      return b.lastVisitDate.getTime() - a.lastVisitDate.getTime();
    })
    .slice(0, 10);

  if (loadingCustomers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Seus Clientes</h2>
        <p className="text-muted-foreground mt-1">
          {customers?.length || 0} clientes cadastrados • Segmentação inteligente
        </p>
      </div>
      
      {/* Search */}
      <div className="flex gap-2 animate-fade-in [animation-delay:100ms]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar cliente por nome ou telefone..." 
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button variant="secondary" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Segment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SegmentCard
          icon={Trophy}
          iconColor="text-primary"
          title="Clientes VIP"
          count={segments.vip.length}
          subtitle={`${vipPercentage}% do faturamento`}
          actionLabel="Ver lista"
          className="[animation-delay:200ms]"
        />
        
        <SegmentCard
          icon={AlertTriangle}
          iconColor="text-warning"
          title="Em Risco"
          count={segments.atRisk.length}
          subtitle={`R$ ${atRiskRevenue.toLocaleString("pt-BR")} em risco`}
          actionLabel="Recuperar agora"
          className="[animation-delay:300ms]"
        />
        
        <SegmentCard
          icon={UserX}
          iconColor="text-destructive"
          title="Perdidos"
          count={segments.lost.length}
          subtitle="Sem vir há 60+ dias"
          actionLabel="Campanha de reativação"
          className="[animation-delay:400ms]"
        />
        
        <SegmentCard
          icon={Sparkles}
          iconColor="text-success"
          title="Novos Clientes"
          count={segments.new.length}
          subtitle={`${newReturned} retornaram (${newReturnRate}%)`}
          actionLabel="Ver retenção"
          className="[animation-delay:500ms]"
        />
      </div>

      {/* Birthday Section */}
      <BirthdaySection />
      
      {/* Recent Clients */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Clientes Recentes</h3>
            <p className="text-sm text-muted-foreground">Últimas movimentações</p>
          </div>
          <button className="text-sm text-primary font-medium hover:underline">
            Ver todos
          </button>
        </div>
        
        {recentClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum cliente encontrado.</p>
            <p className="text-sm mt-1">Os clientes aparecerão aqui após realizarem pedidos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Última Visita</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Gasto</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitas</th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentClients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-3 px-2">
                      <p className="font-medium text-foreground">{client.name}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {client.lastVisit || "Nunca"}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-foreground">
                      R$ {client.spent.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{client.visits}</td>
                    <td className="py-3 px-2 text-center">
                      <WhatsAppButton phone={client.phone} name={client.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
