import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, Medal, Award, Trophy, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  barber?: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface GoalsRankingProps {
  goals: BarberGoal[];
  barbers: Barber[];
}

export function GoalsRanking({ goals, barbers }: GoalsRankingProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Calculate ranking based on goal progress
  const barberRankings = barbers.map(barber => {
    const barberGoals = goals.filter(g => g.barber_id === barber.id);
    const totalProgress = barberGoals.reduce((sum, g) => {
      return sum + Math.min((g.current_value / g.target_value) * 100, 100);
    }, 0);
    const avgProgress = barberGoals.length > 0 ? totalProgress / barberGoals.length : 0;
    const completedGoals = barberGoals.filter(g => g.status === 'completed').length;
    const totalRewards = barberGoals
      .filter(g => g.status === 'completed')
      .reduce((sum, g) => sum + g.reward_value, 0);

    return {
      ...barber,
      avgProgress,
      completedGoals,
      totalGoals: barberGoals.length,
      totalRewards
    };
  }).sort((a, b) => b.avgProgress - a.avgProgress);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-6 w-6 text-warning" />;
      case 1:
        return <Medal className="h-6 w-6 text-muted-foreground" />;
      case 2:
        return <Award className="h-6 w-6 text-primary" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position + 1}</span>;
    }
  };

  const getRankClass = (position: number) => {
    switch (position) {
      case 0:
        return "border-warning/30 bg-warning/5";
      case 1:
        return "border-muted/30 bg-muted/5";
      case 2:
        return "border-primary/30 bg-primary/5";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Ranking de Desempenho - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barberRankings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum barbeiro com metas definidas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {barberRankings.map((barber, index) => (
                <div 
                  key={barber.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${getRankClass(index)}`}
                >
                  <div className="flex items-center justify-center w-10">
                    {getRankIcon(index)}
                  </div>

                  <Avatar className="h-12 w-12">
                    <AvatarImage src={barber.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {barber.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">{barber.name}</p>
                      {barber.completedGoals > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {barber.completedGoals}/{barber.totalGoals} metas
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Progress value={barber.avgProgress} className="h-2" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground min-w-[50px] text-right">
                        {barber.avgProgress.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Premiações</p>
                    <p className="font-bold text-success">
                      R$ {barber.totalRewards.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers Highlight */}
      {barberRankings.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {barberRankings.slice(0, 3).map((barber, index) => (
            <Card key={barber.id} className={`glass ${getRankClass(index)}`}>
              <CardContent className="pt-6 text-center">
                <div className="mb-4">
                  {getRankIcon(index)}
                </div>
                <Avatar className="h-16 w-16 mx-auto mb-3">
                  <AvatarImage src={barber.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {barber.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-bold text-lg">{barber.name}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  {barber.avgProgress.toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">progresso médio</p>
                {barber.totalRewards > 0 && (
                  <Badge className="mt-3 bg-success/20 text-success border-success/30">
                    R$ {barber.totalRewards.toFixed(2)} em prêmios
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
