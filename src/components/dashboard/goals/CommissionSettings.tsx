import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Percent, Save, Settings, User } from "lucide-react";

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface CommissionSetting {
  id: string;
  barber_id: string;
  service_commission_percent: number;
  product_commission_percent: number;
}

interface CommissionSettingsProps {
  barbers: Barber[];
}

export function CommissionSettings({ barbers }: CommissionSettingsProps) {
  const queryClient = useQueryClient();
  const [editingBarber, setEditingBarber] = useState<string | null>(null);
  const [servicePercent, setServicePercent] = useState<string>("");
  const [productPercent, setProductPercent] = useState<string>("");

  // Fetch commission settings
  const { data: commissionSettings, isLoading } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barber_commission_settings')
        .select('*');
      if (error) throw error;
      return data as CommissionSetting[];
    }
  });

  // Save commission settings mutation
  const saveCommission = useMutation({
    mutationFn: async ({ barberId, servicePercent, productPercent }: { 
      barberId: string; 
      servicePercent: number; 
      productPercent: number; 
    }) => {
      const existing = commissionSettings?.find(c => c.barber_id === barberId);
      
      if (existing) {
        const { error } = await supabase
          .from('barber_commission_settings')
          .update({
            service_commission_percent: servicePercent,
            product_commission_percent: productPercent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('barber_commission_settings')
          .insert({
            barber_id: barberId,
            service_commission_percent: servicePercent,
            product_commission_percent: productPercent
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      setEditingBarber(null);
      toast({
        title: "Comissão atualizada",
        description: "A configuração de comissão foi salva com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração de comissão.",
        variant: "destructive"
      });
      console.error(error);
    }
  });

  const getBarberCommission = (barberId: string) => {
    return commissionSettings?.find(c => c.barber_id === barberId);
  };

  const handleEdit = (barber: Barber) => {
    const commission = getBarberCommission(barber.id);
    setEditingBarber(barber.id);
    setServicePercent(commission?.service_commission_percent.toString() || "50");
    setProductPercent(commission?.product_commission_percent.toString() || "10");
  };

  const handleSave = (barberId: string) => {
    const service = parseFloat(servicePercent);
    const product = parseFloat(productPercent);

    if (isNaN(service) || isNaN(product) || service < 0 || product < 0 || service > 100 || product > 100) {
      toast({
        title: "Valor inválido",
        description: "Os percentuais devem estar entre 0 e 100.",
        variant: "destructive"
      });
      return;
    }

    saveCommission.mutate({
      barberId,
      servicePercent: service,
      productPercent: product
    });
  };

  const handleCancel = () => {
    setEditingBarber(null);
    setServicePercent("");
    setProductPercent("");
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configuração de Comissões por Barbeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Configure os percentuais de comissão que cada barbeiro recebe sobre serviços e produtos vendidos.
          As comissões são calculadas automaticamente quando um pedido é concluído.
        </p>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando configurações...</p>
        ) : barbers.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbeiro</TableHead>
                <TableHead className="text-center">Comissão Serviços</TableHead>
                <TableHead className="text-center">Comissão Produtos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barbers.map(barber => {
                const commission = getBarberCommission(barber.id);
                const isEditing = editingBarber === barber.id;

                return (
                  <TableRow key={barber.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={barber.avatar_url || undefined} />
                          <AvatarFallback>{barber.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{barber.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={servicePercent}
                            onChange={(e) => setServicePercent(e.target.value)}
                            className="w-20 text-center"
                          />
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-primary border-primary/30">
                          {commission?.service_commission_percent ?? 50}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={productPercent}
                            onChange={(e) => setProductPercent(e.target.value)}
                            className="w-20 text-center"
                          />
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-info border-info/30">
                          {commission?.product_commission_percent ?? 10}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(barber.id)}
                            disabled={saveCommission.isPending}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(barber)}
                        >
                          Editar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
