import { SegmentCard } from "@/components/ui/segment-card";
import { Trophy, AlertTriangle, UserX, Sparkles, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const recentClients = [
  { name: "Carlos Mendes", status: "VIP", lastVisit: "há 5 dias", spent: "R$ 2.450", visits: 18 },
  { name: "Diego Souza", status: "Em Risco", lastVisit: "há 28 dias", spent: "R$ 890", visits: 8 },
  { name: "Roberto Lima", status: "VIP", lastVisit: "há 12 dias", spent: "R$ 1.820", visits: 14 },
  { name: "Fernando Costa", status: "Perdido", lastVisit: "há 45 dias", spent: "R$ 560", visits: 5 },
  { name: "André Martins", status: "Ativo", lastVisit: "há 3 dias", spent: "R$ 420", visits: 4 },
];

const statusColors: Record<string, string> = {
  "VIP": "bg-primary/10 text-primary",
  "Em Risco": "bg-warning/10 text-warning",
  "Perdido": "bg-destructive/10 text-destructive",
  "Ativo": "bg-success/10 text-success",
};

export function ClientsTab() {
  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Seus Clientes</h2>
        <p className="text-muted-foreground mt-1">Segmentação inteligente para ações estratégicas</p>
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
          count={12}
          subtitle="45% do faturamento"
          actionLabel="Ver lista"
          className="[animation-delay:200ms]"
        />
        
        <SegmentCard
          icon={AlertTriangle}
          iconColor="text-warning"
          title="Em Risco"
          count={23}
          subtitle="R$ 14.500 em risco"
          actionLabel="Recuperar agora"
          className="[animation-delay:300ms]"
        />
        
        <SegmentCard
          icon={UserX}
          iconColor="text-destructive"
          title="Perdidos"
          count={47}
          subtitle="Sem vir há 60+ dias"
          actionLabel="Campanha de reativação"
          className="[animation-delay:400ms]"
        />
        
        <SegmentCard
          icon={Sparkles}
          iconColor="text-success"
          title="Novos Clientes"
          count={8}
          subtitle="6 retornaram (75%)"
          actionLabel="Ver retenção"
          className="[animation-delay:500ms]"
        />
      </div>
      
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
        
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Última Visita</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Gasto</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentClients.map((client, index) => (
                <tr key={index} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <td className="py-3 px-2">
                    <p className="font-medium text-foreground">{client.name}</p>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-muted-foreground">{client.lastVisit}</td>
                  <td className="py-3 px-2 text-right font-medium text-foreground">{client.spent}</td>
                  <td className="py-3 px-2 text-right text-muted-foreground">{client.visits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
