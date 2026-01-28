import { useState } from "react";
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
  barber?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

export function GoalsTab() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("goals");
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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
      let query = supabase
        .from('barber_goals')
        .select(`
          *,
          barber:barbers(id, name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data as BarberGoal[];
    }
  });

  // Calculate goal progress from real data
  const calculateGoalProgress = async (barberId: string, goalType: GoalType, month: number, year: number) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    let value = 0;

    if (goalType === 'cuts') {
      // Count completed orders with haircut services
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_items(service_id, services(category))
        `)
        .eq('barber_id', barberId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());
      
      value = data?.filter(o => 
        o.order_items?.some((item: any) => 
          item.services?.category?.toLowerCase().includes('corte')
        )
      ).length || 0;
    } else if (goalType === 'revenue') {
      // Sum total revenue
      const { data } = await supabase
        .from('orders')
        .select('total_price')
        .eq('barber_id', barberId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());
      
      value = data?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;
    } else if (goalType === 'services') {
      // Count all services
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('barber_id', barberId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());
      
      value = data?.length || 0;
    } else if (goalType === 'product_sales') {
      // Count product sales
      const { data } = await supabase
        .from('orders')
        .select(`
          id,
          order_products(quantity)
        `)
        .eq('barber_id', barberId)
        .eq('status', 'completed')
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString());
      
      value = data?.reduce((sum, o) => 
        sum + (o.order_products?.reduce((s: number, p: any) => s + (p.quantity || 0), 0) || 0)
      , 0) || 0;
    }

    return value;
  };

  // Update goal progress mutation
  const updateGoalProgress = useMutation({
    mutationFn: async (goal: BarberGoal) => {
      const currentValue = await calculateGoalProgress(
        goal.barber_id, 
        goal.goal_type, 
        goal.month, 
        goal.year
      );

      const isCompleted = currentValue >= goal.target_value;
      const newStatus: GoalStatus = isCompleted ? 'completed' : goal.status;

      const { error } = await supabase
        .from('barber_goals')
        .update({
          current_value: currentValue,
          status: newStatus,
          completed_at: isCompleted && !goal.completed_at ? new Date().toISOString() : goal.completed_at
        })
        .eq('id', goal.id);

      if (error) throw error;

      // If goal is completed and wasn't before, create financial record
      if (isCompleted && goal.status !== 'completed' && goal.reward_value > 0) {
        const { error: recordError } = await supabase
          .from('barber_financial_records')
          .insert({
            barber_id: goal.barber_id,
            record_type: 'goal_reward',
            amount: goal.reward_value,
            reference_id: goal.id,
            description: `Premiação por meta atingida - ${getGoalTypeLabel(goal.goal_type)}`,
            month: goal.month,
            year: goal.year
          });

        if (recordError) console.error('Error creating financial record:', recordError);
      }

      return { currentValue, isCompleted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-goals'] });
    }
  });

  // Refresh all goals progress
  const refreshAllGoals = async () => {
    if (!goals) return;
    
    for (const goal of goals.filter(g => g.status === 'active')) {
      await updateGoalProgress.mutateAsync(goal);
    }
    
    toast({
      title: "Progresso atualizado",
      description: "O progresso de todas as metas foi atualizado."
    });
  };

  const getGoalTypeLabel = (type: GoalType) => {
    const labels: Record<GoalType, string> = {
      cuts: 'Quantidade de Cortes',
      revenue: 'Faturamento (R$)',
      services: 'Quantidade de Serviços',
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
