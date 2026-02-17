import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type GoalType = 'cuts' | 'revenue' | 'services' | 'product_sales';

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
  const [serviceId, setServiceId] = useState<string>("");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [targetValue, setTargetValue] = useState("");
  const [rewardValue, setRewardValue] = useState("");
  const [month, setMonth] = useState(currentMonth.toString());
  const [year, setYear] = useState(currentYear.toString());

  // Fetch all active services
  const { data: services } = useQuery({
    queryKey: ['services-for-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category, price, categories')
        .eq('active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Group services by category
  const servicesByCategory = services?.reduce((acc, service) => {
    const cats = (service as any).categories?.length > 0 ? (service as any).categories : [service.category || 'Outros'];
    for (const cat of cats) {
      if (!acc[cat]) acc[cat] = [];
      // Avoid duplicates
      if (!acc[cat].some((s: any) => s.id === service.id)) {
        acc[cat].push(service);
      }
    }
    return acc;
  }, {} as Record<string, typeof services>) || {};

  const createGoal = useMutation({
    mutationFn: async () => {
      if (!barberId || !targetValue || !rewardValue) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      if (goalType === 'services' && !serviceId && !serviceCategory) {
        throw new Error("Selecione um serviço ou categoria para a meta");
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
          service_id: goalType === 'services' && serviceId ? serviceId : null,
          service_category: goalType === 'services' && serviceCategory ? serviceCategory : null,
          target_value: target,
          reward_value: reward,
          month: parseInt(month),
          year: parseInt(year),
          status: 'active',
          current_value: 0
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error("Já existe uma meta similar para este barbeiro neste mês");
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

  const serviceCategories = [
    "Cabelo",
    "Barba",
    "Sobrancelha",
    "Combo",
    "Tratamento",
    "Outros"
  ];

  const baseGoalTypes = [
    { value: "cuts", label: "Quantidade de Cortes" },
    { value: "revenue", label: "Faturamento Total (R$)" },
    { value: "product_sales", label: "Vendas de Produtos" }
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
        <Select value={goalType === 'services' && serviceCategory ? `category_${serviceCategory}` : goalType === 'services' && serviceId ? `service_${serviceId}` : goalType} onValueChange={(v) => {
          if (v.startsWith('category_')) {
            setGoalType('services');
            setServiceCategory(v.replace('category_', ''));
            setServiceId("");
          } else if (v.startsWith('service_')) {
            setGoalType('services');
            setServiceId(v.replace('service_', ''));
            setServiceCategory("");
          } else {
            setGoalType(v as GoalType);
            setServiceId("");
            setServiceCategory("");
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de meta" />
          </SelectTrigger>
          <SelectContent>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
              Metas Gerais
            </div>
            {baseGoalTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
            
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
              Metas por Categoria
            </div>
            {serviceCategories.map(cat => (
              <SelectItem key={cat} value={`category_${cat}`}>
                📁 {cat} (todos os serviços)
              </SelectItem>
            ))}

            {Object.entries(servicesByCategory).length > 0 && (
              <>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">
                  Metas por Serviço Específico
                </div>
                {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                  <div key={category}>
                    <div className="px-3 py-1 text-xs text-muted-foreground italic">
                      {category}
                    </div>
                    {categoryServices?.map(service => (
                      <SelectItem key={service.id} value={`service_${service.id}`}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </>
            )}
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
          {goalType === 'revenue' ? 'Valor da Meta (R$)' : `Quantidade da Meta${goalType === 'services' && serviceCategory ? ` (Categoria: ${serviceCategory})` : goalType === 'services' && serviceId ? ` (${services?.find(s => s.id === serviceId)?.name || 'Serviço'})` : ''}`}
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
