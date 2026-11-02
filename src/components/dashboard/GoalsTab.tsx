import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Target, Plus, Trophy, TrendingUp, DollarSign, Scissors, Package, Award, Medal, Crown, Settings } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GoalCard } from "./goals/GoalCard";
import { GoalForm } from "./goals/GoalForm";
import { BarberStatement } from "./goals/BarberStatement";
import { GoalsRanking } from "./goals/GoalsRanking";
import { CommissionSettings } from "./goals/CommissionSettings";
import { monthYearInSaoPaulo } from "@/shared/lib/dates";
import {
  goalNotifications,
  type GoalNotification,
  type GoalSnapshot,
} from "@/features/metas/domain/goal-notifications";

type GoalType = 'cuts' | 'revenue' | 'services' | 'product_sales';
type GoalStatus = 'active' | 'completed' | 'expired';

interface BarberGoal {
  id: string;
  barber_id: string;
  goal_type: GoalType;
  target_value: number;
  current_value: number;
  reward_value: number;
  month: number;
  year: number;
  status: GoalStatus;
  completed_at: string | null;
  created_at: string;
  service_id?: string | null;
  service_category?: string | null;
  barber?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  service?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

export function GoalsTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("goals");
  const { month: currentMonth, year: currentYear } = monthYearInSaoPaulo();

  const isAdmin = role === 'admin';

  // Fetch barbers
  const { data: barbers } = useQuery({
    queryKey: ['barbers-for-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, avatar_url')
        .eq('active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch current barber for non-admin users
  const { data: currentBarber } = useQuery({
    queryKey: ['current-barber'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('barbers')
        .select('id, name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isAdmin
  });

  // Fetch goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['barber-goals', currentMonth, currentYear],
    queryFn: async () => {
      const query = supabase
        .from('barber_goals')
        .select(`
          *,
          barber:barbers(id, name, avatar_url),
          service:services(id, name, category)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as BarberGoal[];
    }
  });

  // Progresso e premiação são calculados no banco (recalculate_barber_goals).
  // Aqui pedimos o recálculo por barbeiro e avisamos o que mudou.
  const updateGoalProgress = useMutation({
    mutationFn: async (targetGoals: BarberGoal[]) => {
      const groups = new Map<string, BarberGoal[]>();
      for (const goal of targetGoals) {
        const key = `${goal.barber_id}|${goal.month}|${goal.year}`;
        groups.set(key, [...(groups.get(key) ?? []), goal]);
      }

      const notifications: GoalNotification[] = [];
      for (const group of groups.values()) {
        const { barber_id, month, year } = group[0];
        const { data, error } = await supabase.rpc("recalculate_barber_goals", {
          p_barber_id: barber_id,
          p_month: month,
          p_year: year,
        });
        if (error) throw error;
        const before = group.map(toSnapshot);
        const after = (data ?? []).map((g) => {
          const old = group.find((o) => o.id === g.id);
          return toSnapshot({ ...(old ?? (g as BarberGoal)), ...g });
        });
        notifications.push(...goalNotifications(before, after));
      }
      return notifications;
    },
    onSuccess: (notifications) => {
      queryClient.invalidateQueries({ queryKey: ['barber-goals'] });
      queryClient.invalidateQueries({ queryKey: ['barber-financial-records'] });
      for (const n of notifications) {
        toast({
          title: n.kind === 'completed' ? "🏆 Meta atingida!" : "🔥 Meta quase atingida!",
          description: n.message,
          duration: n.kind === 'completed' ? 10000 : 8000,
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Não foi possível atualizar as metas",
        description: err instanceof Error && err.message ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });

  const toSnapshot = (goal: BarberGoal): GoalSnapshot => ({
    id: goal.id,
    label: getGoalTypeLabel(goal.goal_type, goal.service?.name, goal.service_category),
    barberName: goal.barber?.name ?? null,
    targetValue: Number(goal.target_value),
    currentValue: Number(goal.current_value),
    rewardValue: Number(goal.reward_value),
    status: goal.status,
    isRevenue: goal.goal_type === 'revenue',
  });

  // Metas que este usuário pode recalcular: todas (admin) ou só as próprias (barbeiro).
  const refreshableGoals = (goals ?? []).filter(
    (g) => g.status === 'active' && (isAdmin || g.barber_id === currentBarber?.id),
  );

  // Ao abrir a aba, recalcula uma vez (cobre metas criadas depois dos atendimentos).
  const hasAutoRefreshed = useRef(false);
  const { mutate: refreshGoals } = updateGoalProgress;
  useEffect(() => {
    if (hasAutoRefreshed.current || refreshableGoals.length === 0) return;
    hasAutoRefreshed.current = true;
    refreshGoals(refreshableGoals);
  }, [refreshableGoals, refreshGoals]);

  const refreshAllGoals = async () => {
    if (refreshableGoals.length === 0) return;
    await updateGoalProgress.mutateAsync(refreshableGoals);
    toast({
      title: "Progresso atualizado",
      description: "O progresso de todas as metas foi atualizado."
    });
  };

  const getGoalTypeLabel = (type: GoalType, serviceName?: string, serviceCategory?: string | null) => {
    if (type === 'services' && serviceCategory) {
      return `Categoria: ${serviceCategory}`;
    }
    if (type === 'services' && serviceName) {
      return serviceName;
    }
    const labels: Record<GoalType, string> = {
      cuts: 'Quantidade de Cortes',
      revenue: 'Faturamento (R$)',
      services: 'Serviço Específico',
      product_sales: 'Vendas de Produtos'
    };
    return labels[type];
  };

  const getGoalTypeIcon = (type: GoalType) => {
    const icons: Record<GoalType, React.ReactNode> = {
      cuts: <Scissors className="h-4 w-4" />,
      revenue: <DollarSign className="h-4 w-4" />,
      services: <TrendingUp className="h-4 w-4" />,
      product_sales: <Package className="h-4 w-4" />
    };
    return icons[type];
  };

  // Filter goals for current month
  const currentMonthGoals = goals?.filter(g => 
    g.month === currentMonth && g.year === currentYear
  ) || [];

  // Filter goals for barber view
  const barberGoals = !isAdmin && currentBarber 
    ? goals?.filter(g => g.barber_id === currentBarber.id) || []
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metas & Premiações
          </h2>
          <p className="text-muted-foreground">
            {isAdmin 
              ? "Gerencie metas individuais e acompanhe o desempenho da equipe"
              : "Acompanhe suas metas e premiações"
            }
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAllGoals} disabled={updateGoalProgress.isPending}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Atualizar Progresso
          </Button>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Meta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Nova Meta</DialogTitle>
                </DialogHeader>
                <GoalForm 
                  barbers={barbers || []} 
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['barber-goals'] });
                  }} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="statement" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Extrato
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="commissions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Comissões
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="goals" className="mt-6">
          {isAdmin ? (
            <div className="space-y-6">
              {/* Current Month Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Metas Ativas</p>
                        <p className="text-2xl font-bold">
                          {currentMonthGoals.filter(g => g.status === 'active').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <Trophy className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Metas Batidas</p>
                        <p className="text-2xl font-bold">
                          {currentMonthGoals.filter(g => g.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <Award className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Premiações Pagas</p>
                        <p className="text-2xl font-bold">
                          R$ {currentMonthGoals
                            .filter(g => g.status === 'completed')
                            .reduce((sum, g) => sum + g.reward_value, 0)
                            .toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-info/10">
                        <TrendingUp className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Progresso Médio</p>
                        <p className="text-2xl font-bold">
                          {currentMonthGoals.length > 0
                            ? Math.round(
                                currentMonthGoals.reduce((sum, g) => 
                                  sum + Math.min((g.current_value / g.target_value) * 100, 100)
                                , 0) / currentMonthGoals.length
                              )
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Goals List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goalsLoading ? (
                  <p className="text-muted-foreground col-span-full text-center py-8">
                    Carregando metas...
                  </p>
                ) : currentMonthGoals.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium text-muted-foreground">
                        Nenhuma meta criada para {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                      </p>
                      <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Meta
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  currentMonthGoals.map(goal => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      isAdmin={isAdmin}
                      getGoalTypeLabel={getGoalTypeLabel}
                      getGoalTypeIcon={getGoalTypeIcon}
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
            // Barber View
            <div className="space-y-6">
              {barberGoals.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">
                      Você não tem metas definidas ainda
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aguarde o administrador definir suas metas mensais
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {barberGoals.map(goal => (
                    <GoalCard 
                      key={goal.id} 
                      goal={goal} 
                      isAdmin={false}
                      getGoalTypeLabel={getGoalTypeLabel}
                      getGoalTypeIcon={getGoalTypeIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-6">
          <GoalsRanking 
            goals={currentMonthGoals} 
            barbers={barbers || []}
          />
        </TabsContent>

        <TabsContent value="statement" className="mt-6">
          <BarberStatement 
            barbers={barbers || []}
            currentBarber={currentBarber}
            isAdmin={isAdmin}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="commissions" className="mt-6">
            <CommissionSettings barbers={barbers || []} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
