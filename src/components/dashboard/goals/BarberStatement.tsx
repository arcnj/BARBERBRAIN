import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, FileText, TrendingUp, Package, Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface BarberStatementProps {
  barbers: Barber[];
  currentBarber: Barber | null | undefined;
  isAdmin: boolean;
}

interface FinancialRecord {
  id: string;
  barber_id: string;
  record_type: string;
  amount: number;
  description: string | null;
  month: number;
  year: number;
  created_at: string;
}

export function BarberStatement({ barbers, currentBarber, isAdmin }: BarberStatementProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [selectedBarber, setSelectedBarber] = useState(isAdmin ? "" : currentBarber?.id || "");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const barberId = isAdmin ? selectedBarber : currentBarber?.id;

  // Fetch financial records
  const { data: records, isLoading } = useQuery({
    queryKey: ['barber-financial-records', barberId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!barberId) return [];

      const { data, error } = await supabase
        .from('barber_financial_records')
        .select('*')
        .eq('barber_id', barberId)
        .eq('month', parseInt(selectedMonth))
        .eq('year', parseInt(selectedYear))
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinancialRecord[];
    },
    enabled: !!barberId
  });

  // Fetch commission settings
  const { data: commissionSettings } = useQuery({
    queryKey: ['barber-commission-settings', barberId],
    queryFn: async () => {
      if (!barberId) return null;

      const { data, error } = await supabase
        .from('barber_commission_settings')
        .select('*')
        .eq('barber_id', barberId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!barberId
  });

  // Calculate totals
  const serviceCommissions = records?.filter(r => r.record_type === 'service_commission')
    .reduce((sum, r) => sum + r.amount, 0) || 0;
  const productCommissions = records?.filter(r => r.record_type === 'product_commission')
    .reduce((sum, r) => sum + r.amount, 0) || 0;
  const goalRewards = records?.filter(r => r.record_type === 'goal_reward')
    .reduce((sum, r) => sum + r.amount, 0) || 0;
  const totalEarnings = serviceCommissions + productCommissions + goalRewards;

  const getRecordTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      service_commission: 'Comissão Serviço',
      product_commission: 'Comissão Produto',
      goal_reward: 'Premiação Meta'
    };
    return labels[type] || type;
  };

  const getRecordTypeIcon = (type: string) => {
    switch (type) {
      case 'service_commission':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'product_commission':
        return <Package className="h-4 w-4 text-info" />;
      case 'goal_reward':
        return <Trophy className="h-4 w-4 text-success" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="glass">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {isAdmin && (
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-muted-foreground mb-2 block">Barbeiro</label>
                <Select value={selectedBarber} onValueChange={setSelectedBarber}>
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
            )}
            <div className="w-[150px]">
              <label className="text-sm text-muted-foreground mb-2 block">Mês</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
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
            <div className="w-[120px]">
              <label className="text-sm text-muted-foreground mb-2 block">Ano</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
                  <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!barberId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Selecione um barbeiro para ver o extrato
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissões Serviços</p>
                    <p className="text-xl font-bold">R$ {serviceCommissions.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Package className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Comissões Produtos</p>
                    <p className="text-xl font-bold">R$ {productCommissions.toFixed(2)}</p>
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
                    <p className="text-sm text-muted-foreground">Premiações</p>
                    <p className="text-xl font-bold">R$ {goalRewards.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total a Receber</p>
                    <p className="text-2xl font-bold text-primary">R$ {totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Commission Settings */}
          {commissionSettings && (
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Configuração de Comissões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Serviços</p>
                    <p className="text-lg font-bold">{commissionSettings.service_commission_percent}%</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div>
                    <p className="text-sm text-muted-foreground">Comissão Produtos</p>
                    <p className="text-lg font-bold">{commissionSettings.product_commission_percent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Records Table */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extrato Detalhado - {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando...</p>
              ) : records?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro encontrado para este período</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records?.map(record => (
                      <TableRow key={record.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRecordTypeIcon(record.record_type)}
                            <Badge variant="outline">
                              {getRecordTypeLabel(record.record_type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{record.description || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          + R$ {record.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
