import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type GoalType = 'cuts' | 'revenue' | 'services';

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface GoalFormProps {
  barbers: Barber[];
  onSuccess: () => void;
}

export function GoalForm({ barbers, onSuccess }: GoalFormProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [barberId, setBarberId] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("cuts");
  const [targetValue, setTargetValue] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [month, setMonth] = useState(currentMonth.toString());
  const [year, setYear] = useState(currentYear.toString());

  const createGoal = useMutation({
    mutationFn: async () => {
      if (!barberId || !targetValue || !rewardValue) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

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
        .insert({
          barber_id: barberId,
          goal_type: goalType,
          target_value: target,
          reward_value: reward,
          month: parseInt(month),
          year: parseInt(year),
          status: 'active',
          current_value: 0
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Já existe uma meta para este barbeiro neste mês");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Meta criada!",
        description: "A meta foi criada com sucesso."
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const months = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" }
  ];

  const goalTypes = [
    { value: "cuts", label: "Quantidade de Cortes" },
    { value: "revenue", label: "Faturamento Total (R$)" },
    { value: "services", label: "Quantidade de Serviços" }
  ];

  return (
    <form onSubmit={(e) => { e.preventDefault(); createGoal.mutate(); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Barbeiro</Label>
        <Select value={barberId} onValueChange={setBarberId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um barbeiro" />
          </SelectTrigger>
          <SelectContent>
            {barbers.map(barber => (
              <SelectItem key={barber.id} value={barber.id}>
                {barber.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Meta</Label>
        <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {goalTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ano</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Valor da Meta 
          {goalType === 'revenue' ? ' (R$)' : ' (quantidade)'}
        </Label>
        <Input
          type="number"
          min="1"
          step={goalType === 'revenue' ? '0.01' : '1'}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder={goalType === 'revenue' ? 'Ex: 8000.00' : 'Ex: 120'}
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
          placeholder="Ex: 200.00"
        />
      </div>

      <Button type="submit" className="w-full" disabled={createGoal.isPending}>
        {createGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Criar Meta
      </Button>
    </form>
  );
}
