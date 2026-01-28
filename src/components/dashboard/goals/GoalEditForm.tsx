import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
}

interface GoalEditFormProps {
  goal: BarberGoal;
  onSuccess: () => void;
}

export function GoalEditForm({ goal, onSuccess }: GoalEditFormProps) {
  const [targetValue, setTargetValue] = useState(goal.target_value.toString());
  const [rewardValue, setRewardValue] = useState(goal.reward_value.toString());

  const updateGoal = useMutation({
    mutationFn: async () => {
      const target = parseFloat(targetValue);
      const reward = parseFloat(rewardValue);

      if (target <= 0) {
        throw new Error("O valor da meta deve ser maior que zero");
      }

      if (reward < 0) {
        throw new Error("O valor da premiação não pode ser negativo");
      }

      const { error } = await supabase
        .from('barber_goals')
        .update({
          target_value: target,
          reward_value: reward
        })
        .eq('id', goal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Meta atualizada!",
        description: "Os valores da meta foram atualizados com sucesso."
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar meta",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('barber_goals')
        .delete()
        .eq('id', goal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Meta removida",
        description: "A meta foi removida com sucesso."
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover meta",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getGoalTypeLabel = (type: GoalType) => {
    const labels: Record<GoalType, string> = {
      cuts: 'Quantidade de Cortes',
      revenue: 'Faturamento (R$)',
      services: 'Quantidade de Serviços',
      product_sales: 'Vendas de Produtos'
    };
    return labels[type];
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); updateGoal.mutate(); }} className="space-y-4">
      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground">Tipo de Meta</p>
        <p className="font-medium">{getGoalTypeLabel(goal.goal_type)}</p>
      </div>

      <div className="space-y-2">
        <Label>
          Valor da Meta 
          {goal.goal_type === 'revenue' ? ' (R$)' : ' (quantidade)'}
        </Label>
        <Input
          type="number"
          min="1"
          step={goal.goal_type === 'revenue' ? '0.01' : '1'}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Valor da Premiação (R$)</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={rewardValue}
          onChange={(e) => setRewardValue(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={updateGoal.isPending}>
          {updateGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Alterações
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover Meta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. A meta será permanentemente removida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteGoal.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </form>
  );
}
