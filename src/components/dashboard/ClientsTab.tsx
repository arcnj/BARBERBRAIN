import { useState } from "react";
import { SegmentCard } from "@/components/ui/segment-card";
import { Trophy, AlertTriangle, UserX, Sparkles, Search, Filter, Loader2, FileSpreadsheet, FileText, Download, Calendar } from "lucide-react";
import { BirthdaySection } from "./BirthdaySection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { PeriodFilter } from "@/components/ui/period-filter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ClientStatus = "VIP" | "Em Risco" | "Perdido" | "Ativo" | "Novo";

interface ClientWithMetrics {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: ClientStatus;
  lastVisit: string | null;
  lastVisitDate: Date | null;
  spent: number;
  visits: number;
  birthDate: string | null;
}

const statusColors: Record<ClientStatus, string> = {
  "VIP": "bg-primary/10 text-primary",
  "Em Risco": "bg-warning/10 text-warning",
  "Perdido": "bg-destructive/10 text-destructive",
  "Ativo": "bg-success/10 text-success",
  "Novo": "bg-blue-500/10 text-blue-500",
};

function calculateStatus(visits: number, spent: number, daysSinceLastVisit: number | null): ClientStatus {
  if (visits >= 10 || spent >= 1500) return "VIP";
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 60) return "Perdido";
  if (daysSinceLastVisit !== null && daysSinceLastVisit >= 30) return "Em Risco";
  if (visits <= 2) return "Novo";
  return "Ativo";
}

export function ClientsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));
  const [periodType, setPeriodType] = useState<string>("month");
  const [filterByPeriod, setFilterByPeriod] = useState(false);

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-with-orders"],
    queryFn: async () => {
      const { data: customerRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      if (!customerRoles?.length) return [];

      const customerIds = customerRoles.map(r => r.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", customerIds);

      const { data: orders } = await supabase
        .from("orders")
        .select("customer_id, total_price, scheduled_at, status")
        .eq("status", "completed")
        .in("customer_id", customerIds);

      const clientsWithMetrics: ClientWithMetrics[] = (profiles || []).map(profile => {
        const customerOrders = orders?.filter(o => o.customer_id === profile.user_id) || [];
        const visits = customerOrders.length;
        const spent = customerOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
        
        const sortedOrders = [...customerOrders].sort((a, b) => 
          new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime()
        );
        const lastVisitDate = sortedOrders[0]?.scheduled_at ? new Date(sortedOrders[0].scheduled_at) : null;
        const daysSinceLastVisit = lastVisitDate 
          ? Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const status = calculateStatus(visits, spent, daysSinceLastVisit);

        return {
          id: profile.id,
          name: profile.full_name || "Sem nome",
          phone: profile.phone || null,
          email: profile.email || null,
          status,
          lastVisit: lastVisitDate 
            ? formatDistanceToNow(lastVisitDate, { addSuffix: true, locale: ptBR })
            : null,
          lastVisitDate,
          spent,
          visits,
          birthDate: profile.birth_date || null,
        };
      });

      return clientsWithMetrics;
    },
  });

  // Filter customers
  const filteredCustomers = customers?.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    
    const matchesPeriod = !filterByPeriod || 
      (customer.lastVisitDate && isWithinInterval(customer.lastVisitDate, { start: periodStart, end: periodEnd }));
    
    return matchesSearch && matchesPeriod;
  }) || [];

  // Calculate segment counts from filtered
  const segments = {
    vip: filteredCustomers.filter(c => c.status === "VIP"),
    atRisk: filteredCustomers.filter(c => c.status === "Em Risco"),
    lost: filteredCustomers.filter(c => c.status === "Perdido"),
    new: filteredCustomers.filter(c => c.status === "Novo"),
    active: filteredCustomers.filter(c => c.status === "Ativo"),
  };

  const totalRevenue = filteredCustomers.reduce((sum, c) => sum + c.spent, 0);
  const vipRevenue = segments.vip.reduce((sum, c) => sum + c.spent, 0);
  const vipPercentage = totalRevenue > 0 ? Math.round((vipRevenue / totalRevenue) * 100) : 0;
  const atRiskRevenue = segments.atRisk.reduce((sum, c) => sum + c.spent, 0);
  const newReturned = segments.new.filter(c => c.visits >= 2).length;
  const newReturnRate = segments.new.length > 0 ? Math.round((newReturned / segments.new.length) * 100) : 0;

  const recentClients = [...filteredCustomers]
    .sort((a, b) => {
      if (!a.lastVisitDate && !b.lastVisitDate) return b.spent - a.spent;
      if (!a.lastVisitDate) return 1;
      if (!b.lastVisitDate) return -1;
      return b.lastVisitDate.getTime() - a.lastVisitDate.getTime();
    });

  const handlePeriodChange = (start: Date, end: Date, type: string) => {
    setPeriodStart(start);
    setPeriodEnd(end);
    setPeriodType(type);
  };

  const exportToExcel = () => {
    const data = recentClients.map(client => ({
      "Nome": client.name,
      "Telefone": client.phone || "-",
      "Email": client.email || "-",
      "Status": client.status,
      "Última Visita": client.lastVisitDate ? format(client.lastVisitDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
      "Total Gasto (R$)": client.spent.toFixed(2),
      "Visitas": client.visits,
      "Data de Nascimento": client.birthDate ? format(new Date(client.birthDate), "dd/MM/yyyy", { locale: ptBR }) : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    
    // Add column widths
    ws["!cols"] = [
      { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
    ];
    
    XLSX.writeFile(wb, `relatorio-clientes-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Clientes", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 28, { align: "center" });
    
    if (filterByPeriod) {
      doc.text(`Período: ${format(periodStart, "dd/MM/yyyy", { locale: ptBR })} a ${format(periodEnd, "dd/MM/yyyy", { locale: ptBR })}`, pageWidth / 2, 34, { align: "center" });
    }

    // Summary section
    let yPos = 45;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Resumo", 14, yPos);
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const summaryData = [
      ["Total de Clientes", filteredCustomers.length.toString()],
      ["Clientes VIP", `${segments.vip.length} (${vipPercentage}% do faturamento)`],
      ["Clientes Em Risco", `${segments.atRisk.length} (R$ ${atRiskRevenue.toLocaleString("pt-BR")} em risco)`],
      ["Clientes Perdidos", segments.lost.length.toString()],
      ["Novos Clientes", `${segments.new.length} (${newReturnRate}% retornaram)`],
      ["Clientes Ativos", segments.active.length.toString()],
      ["Faturamento Total", `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [["Métrica", "Valor"]],
      body: summaryData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 },
    });

    // Clients table
    yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Lista de Clientes", 14, yPos);

    const tableData = recentClients.map(client => [
      client.name,
      client.phone || "-",
      client.status,
      client.lastVisitDate ? format(client.lastVisitDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
      `R$ ${client.spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      client.visits.toString(),
    ]);

    autoTable(doc, {
      startY: yPos + 5,
      head: [["Nome", "Telefone", "Status", "Última Visita", "Total Gasto", "Visitas"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
      },
    });

    // Segment details
    const addSegmentPage = (title: string, clients: ClientWithMetrics[], color: [number, number, number]) => {
      if (clients.length === 0) return;
      
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Total: ${clients.length} clientes`, 14, 28);
      doc.text(`Faturamento: R$ ${clients.reduce((s, c) => s + c.spent, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, 34);

      const segmentData = clients.map(client => [
        client.name,
        client.phone || "-",
        client.email || "-",
        client.lastVisitDate ? format(client.lastVisitDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
        `R$ ${client.spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        client.visits.toString(),
        client.birthDate ? format(new Date(client.birthDate), "dd/MM", { locale: ptBR }) : "-",
      ]);

      autoTable(doc, {
        startY: 42,
        head: [["Nome", "Telefone", "Email", "Última Visita", "Total Gasto", "Visitas", "Aniversário"]],
        body: segmentData,
        theme: "striped",
        headStyles: { fillColor: color },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 },
      });
    };

    addSegmentPage("Clientes VIP", segments.vip, [79, 70, 229]);
    addSegmentPage("Clientes Em Risco", segments.atRisk, [234, 179, 8]);
    addSegmentPage("Clientes Perdidos", segments.lost, [220, 38, 38]);
    addSegmentPage("Novos Clientes", segments.new, [59, 130, 246]);
    addSegmentPage("Clientes Ativos", segments.active, [34, 197, 94]);

    doc.save(`relatorio-clientes-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  if (loadingCustomers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="font-display text-2xl font-bold text-foreground">Seus Clientes</h2>
        <p className="text-muted-foreground mt-1">
          {filteredCustomers.length} clientes {filterByPeriod ? "no período" : "cadastrados"} • Segmentação inteligente
        </p>
      </div>
      
      {/* Filters and Export */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in [animation-delay:100ms]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar cliente por nome ou telefone..." 
            className="pl-10 bg-card border-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={filterByPeriod ? "default" : "secondary"} 
            size="sm"
            onClick={() => setFilterByPeriod(!filterByPeriod)}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            {filterByPeriod ? "Filtro ativo" : "Filtrar período"}
          </Button>
          
          {filterByPeriod && (
            <PeriodFilter onPeriodChange={handlePeriodChange} />
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-red-600" />
                Exportar PDF Detalhado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Segment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SegmentCard
          icon={Trophy}
          iconColor="text-primary"
          title="Clientes VIP"
          count={segments.vip.length}
          subtitle={`${vipPercentage}% do faturamento`}
          actionLabel="Ver lista"
          className="[animation-delay:200ms]"
        />
        
        <SegmentCard
          icon={AlertTriangle}
          iconColor="text-warning"
          title="Em Risco"
          count={segments.atRisk.length}
          subtitle={`R$ ${atRiskRevenue.toLocaleString("pt-BR")} em risco`}
          actionLabel="Recuperar agora"
          className="[animation-delay:300ms]"
        />
        
        <SegmentCard
          icon={UserX}
          iconColor="text-destructive"
          title="Perdidos"
          count={segments.lost.length}
          subtitle="Sem vir há 60+ dias"
          actionLabel="Campanha de reativação"
          className="[animation-delay:400ms]"
        />
        
        <SegmentCard
          icon={Sparkles}
          iconColor="text-success"
          title="Novos Clientes"
          count={segments.new.length}
          subtitle={`${newReturned} retornaram (${newReturnRate}%)`}
          actionLabel="Ver retenção"
          className="[animation-delay:500ms]"
        />
      </div>

      {/* Birthday Section */}
      <BirthdaySection />
      
      {/* Clients List */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {filterByPeriod ? "Clientes no Período" : "Clientes Recentes"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filterByPeriod 
                ? `${format(periodStart, "dd/MM/yyyy", { locale: ptBR })} a ${format(periodEnd, "dd/MM/yyyy", { locale: ptBR })}`
                : "Últimas movimentações"}
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {recentClients.length} clientes
          </span>
        </div>
        
        {recentClients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum cliente encontrado.</p>
            <p className="text-sm mt-1">
              {filterByPeriod 
                ? "Tente ajustar o período selecionado."
                : "Os clientes aparecerão aqui após realizarem pedidos."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Última Visita</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Gasto</th>
                  <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitas</th>
                  <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentClients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <td className="py-3 px-2">
                      <p className="font-medium text-foreground">{client.name}</p>
                      {client.email && <p className="text-xs text-muted-foreground">{client.email}</p>}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-sm text-muted-foreground">
                      {client.lastVisit || "Nunca"}
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-foreground">
                      R$ {client.spent.toLocaleString("pt-BR")}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{client.visits}</td>
                    <td className="py-3 px-2 text-center">
                      <WhatsAppButton phone={client.phone} name={client.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
