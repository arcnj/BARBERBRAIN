import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Edit, Trophy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GoalEditForm } from "./GoalEditForm";

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

interface GoalCardProps {
  goal: BarberGoal;
  isAdmin: boolean;
  getGoalTypeLabel: (type: GoalType) => string;
  getGoalTypeIcon: (type: GoalType) => React.ReactNode;
}

export function GoalCard({ goal, isAdmin, getGoalTypeLabel, getGoalTypeIcon }: GoalCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const progress = Math.min((goal.current_value / goal.target_value) * 100, 100);
  const isCompleted = goal.status === 'completed';
  const isExpired = goal.status === 'expired';

  const getStatusBadge = () => {
    if (isCompleted) {
      return (
        <Badge className="bg-success/20 text-success border-success/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Batida
        </Badge>
      );
    }
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expirada
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Em Andamento
      </Badge>
    );
  };

  const formatValue = (value: number, type: GoalType) => {
    if (type === 'revenue') {
      return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    return value.toString();
  };

  const getProgressColor = () => {
    if (progress >= 100) return "bg-success";
    if (progress >= 75) return "bg-warning";
    if (progress >= 50) return "bg-info";
    return "bg-primary";
  };

  return (
    <Card className={`glass transition-all duration-300 ${isCompleted ? 'border-success/30 bg-success/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={goal.barber?.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {goal.barber?.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{goal.barber?.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(goal.year, goal.month - 1), 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && goal.status === 'active' && (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Meta</DialogTitle>
                  </DialogHeader>
                  <GoalEditForm 
                    goal={goal}
                    onSuccess={() => {
                      setIsEditOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['barber-goals'] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="p-1.5 rounded bg-primary/10 text-primary">
            {getGoalTypeIcon(goal.goal_type)}
          </span>
          <span className="text-muted-foreground">{getGoalTypeLabel(goal.goal_type)}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground">
              {formatValue(goal.current_value, goal.goal_type)} / {formatValue(goal.target_value, goal.goal_type)}
            </span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-3" />
            <div 
              className={`absolute inset-0 h-3 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-right text-sm font-medium">
            {progress.toFixed(0)}%
            {progress > 100 && (
              <span className="text-success ml-1">
                (+{(progress - 100).toFixed(0)}% acima da meta!)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Trophy className={`h-4 w-4 ${isCompleted ? 'text-success' : 'text-muted-foreground'}`} />
            <span className="text-sm">
              Premiação: <span className="font-bold text-success">R$ {goal.reward_value.toFixed(2)}</span>
            </span>
          </div>
        </div>

        {isCompleted && goal.completed_at && (
          <p className="text-xs text-success text-center">
            ✨ Meta batida em {format(new Date(goal.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
