import { StatCard } from "@/components/ui/stat-card";
import { AlertCard } from "@/components/ui/alert-card";
import { DollarSign, Users, Clock, Calendar, AlertTriangle, TrendingUp, UserX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const occupancyData = [
  { hour: "9h", value: 100, occupied: true },
  { hour: "10h", value: 100, occupied: true },
  { hour: "11h", value: 100, occupied: true },
  { hour: "12h", value: 50, occupied: false },
  { hour: "13h", value: 0, occupied: false },
  { hour: "14h", value: 25, occupied: false },
  { hour: "15h", value: 100, occupied: true },
  { hour: "16h", value: 0, occupied: false },
  { hour: "17h", value: 100, occupied: true },
  { hour: "18h", value: 75, occupied: false },
  { hour: "19h", value: 100, occupied: true },
  { hour: "20h", value: 50, occupied: false },
];

const upcomingAppointments = [
  { time: "15:00", client: "João Silva", service: "Corte + Barba", barber: "Carlos" },
  { time: "15:30", client: "Pedro Santos", service: "Corte Degradê", barber: "Junior" },
  { time: "16:00", client: "Lucas Mendes", service: "Barba Completa", barber: "Carlos" },
];

export function TodayTab() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Boa tarde, João! ☀️</h2>
        <p className="text-muted-foreground mt-1">Aqui está o resumo do seu dia</p>
      </div>
      
      {/* Alerts */}
      <div className="space-y-3">
        <AlertCard
          icon={AlertTriangle}
          variant="warning"
          title="15 clientes em risco precisam de atenção"
          description="18 deles são VIPs! Envie mensagens agora."
          actionLabel="Ver lista e mensagens"
        />
        
        <AlertCard
          icon={Clock}
          variant="info"
          title="5 horários vagos à tarde"
          description="Ofereça para clientes em risco para preencher a agenda."
          actionLabel="Oferecer para clientes"
        />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Faturamento Hoje"
          value="R$ 847,50"
          icon={DollarSign}
          trend={{ value: "+12% vs média", isPositive: true }}
          subtitle="7 dias"
          className="[animation-delay:100ms]"
        />
        
        <StatCard
          title="Clientes Atendidos"
          value="14"
          icon={Users}
          subtitle="Ticket médio: R$ 60,54"
          className="[animation-delay:200ms]"
        />
        
        <StatCard
          title="Taxa de Ocupação"
          value="68%"
          icon={TrendingUp}
          trend={{ value: "+5%", isPositive: true }}
          subtitle="vs semana passada"
          className="[animation-delay:300ms]"
        />
        
        <StatCard
          title="No-shows"
          value="2"
          icon={UserX}
          trend={{ value: "-8%", isPositive: false }}
          subtitle="vs terça passada"
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
          <button className="text-sm text-primary font-medium hover:underline">
            Ver agenda completa
          </button>
        </div>
        
        <div className="space-y-3">
          {upcomingAppointments.map((apt, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="text-center min-w-[48px]">
                <p className="font-display font-bold text-foreground">{apt.time}</p>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{apt.client}</p>
                <p className="text-sm text-muted-foreground">{apt.service}</p>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{apt.barber}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
