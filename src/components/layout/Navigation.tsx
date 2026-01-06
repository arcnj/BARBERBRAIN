import { cn } from "@/lib/utils";
import { Calendar, Users, Scissors, Megaphone, CalendarDays, UserCog, Package, Sparkles, ClipboardList, Warehouse } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role?: "admin" | "barber" | "customer" | null;
}

// Tabs disponíveis para cada role
const adminTabs = [
  { id: "hoje", label: "Hoje", icon: Calendar },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "barbeiros", label: "Barbeiros", icon: UserCog },
  { id: "servicos", label: "Serviços", icon: Scissors },
  { id: "produtos", label: "Produtos", icon: Package },
  { id: "estoque", label: "Estoque", icon: Warehouse },
  { id: "promocoes", label: "Promoções", icon: Megaphone },
  { id: "satisfacao", label: "Satisfação", icon: ClipboardList },
  { id: "analista", label: "Analista Barber", icon: Sparkles },
];

const barberTabs = [
  { id: "hoje", label: "Hoje", icon: Calendar },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
];

export function Navigation({ activeTab, onTabChange, role }: NavigationProps) {
  // Admins veem todas as tabs, barbeiros só veem hoje e agenda
  const tabs = role === "admin" ? adminTabs : barberTabs;

  return (
    <nav className="sticky top-16 z-40 glass border-b border-border/50">
      <div className="container">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomNavigation({ activeTab, onTabChange, role }: NavigationProps) {
  // Admins veem todas as tabs, barbeiros só veem hoje e agenda
  const tabs = role === "admin" ? adminTabs : barberTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 lg:hidden">
      <div className="flex items-center justify-around py-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[64px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
