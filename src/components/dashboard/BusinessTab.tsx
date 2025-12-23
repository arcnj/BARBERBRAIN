import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, TrendingUp, Users, Scissors } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area } from "recharts";

const revenueData = [
  { day: "Seg", value: 1240 },
  { day: "Ter", value: 980 },
  { day: "Qua", value: 1450 },
  { day: "Qui", value: 1680 },
  { day: "Sex", value: 2100 },
  { day: "Sáb", value: 2450 },
  { day: "Dom", value: 0 },
];

const barbers = [
  { name: "Carlos", revenue: "R$ 18.450", clients: 87, ticket: "R$ 212", rating: 4.8 },
  { name: "Junior", revenue: "R$ 12.300", clients: 62, ticket: "R$ 198", rating: 4.5 },
  { name: "André", revenue: "R$ 9.800", clients: 48, ticket: "R$ 204", rating: 4.7 },
];

const services = [
  { rank: 1, name: "Corte Degradê", count: 142, price: "R$ 35" },
  { rank: 2, name: "Barba Completa", count: 98, price: "R$ 25" },
  { rank: 3, name: "Corte + Barba", count: 87, price: "R$ 55", highlight: true },
  { rank: 4, name: "Sobrancelha", count: 45, price: "R$ 15" },
  { rank: 5, name: "Hidratação", count: 12, price: "R$ 40" },
];

export function BusinessTab() {
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
          value="R$ 42.580"
          icon={DollarSign}
          trend={{ value: "+18%", isPositive: true }}
          subtitle="vs mês anterior"
          className="[animation-delay:100ms]"
        />
        
        <StatCard
          title="Ticket Médio"
          value="R$ 62,40"
          icon={TrendingUp}
          trend={{ value: "+5%", isPositive: true }}
          subtitle="vs mês anterior"
          className="[animation-delay:200ms]"
        />
        
        <StatCard
          title="Total de Clientes"
          value="328"
          icon={Users}
          trend={{ value: "+12", isPositive: true }}
          subtitle="novos este mês"
          className="[animation-delay:300ms]"
        />
        
        <StatCard
          title="Atendimentos"
          value="682"
          icon={Scissors}
          trend={{ value: "+8%", isPositive: true }}
          subtitle="vs mês anterior"
          className="[animation-delay:400ms]"
        />
      </div>
      
      {/* Revenue Chart */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:500ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">Faturamento Semanal</h3>
            <p className="text-sm text-muted-foreground">Última semana</p>
          </div>
          <select className="text-sm bg-muted border-none rounded-lg px-3 py-1.5 text-foreground">
            <option>Esta semana</option>
            <option>Última semana</option>
            <option>Últimos 30 dias</option>
          </select>
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
                tickFormatter={(value) => `R$${value/1000}k`}
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
          
          <div className="space-y-4">
            {barbers.map((barber, index) => (
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
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-primary text-xs">★</span>
                    <span className="text-xs text-muted-foreground">{barber.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Services Ranking */}
        <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:700ms]">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-foreground">Ranking de Serviços</h3>
            <p className="text-sm text-muted-foreground">Mais realizados este mês</p>
          </div>
          
          <div className="space-y-3">
            {services.map((service) => (
              <div 
                key={service.rank} 
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  service.highlight ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'
                }`}
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
                  {service.highlight && (
                    <span className="text-xs text-primary">💰 Combo campeão</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
