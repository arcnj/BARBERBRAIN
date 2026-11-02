import { useState } from "react";
import { SegmentCard } from "@/components/ui/segment-card";
import { Trophy, AlertTriangle, UserX, Sparkles, Search, Filter, Loader2, FileSpreadsheet, FileText, Download, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type SegmentFilter = "all" | "VIP" | "Em Risco" | "Perdido" | "Novo" | "Ativo";

export function ClientsTab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [periodStart, setPeriodStart] = useState<Date>(startOfMonth(new Date()));
  const [periodEnd, setPeriodEnd] = useState<Date>(endOfMonth(new Date()));
  const [periodType, setPeriodType] = useState<string>("month");
  const [filterByPeriod, setFilterByPeriod] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<SegmentFilter>("all");

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
    
    const matchesSegment = selectedSegment === "all" || customer.status === selectedSegment;
    
    return matchesSearch && matchesPeriod && matchesSegment;
  }) || [];

  // Calculate segment counts from ALL customers (not filtered)
  const allSegments = {
    vip: customers?.filter(c => c.status === "VIP") || [],
    atRisk: customers?.filter(c => c.status === "Em Risco") || [],
    lost: customers?.filter(c => c.status === "Perdido") || [],
    new: customers?.filter(c => c.status === "Novo") || [],
    active: customers?.filter(c => c.status === "Ativo") || [],
  };

  const totalRevenue = customers?.reduce((sum, c) => sum + c.spent, 0) || 0;
  const vipRevenue = allSegments.vip.reduce((sum, c) => sum + c.spent, 0);
  const vipPercentage = totalRevenue > 0 ? Math.round((vipRevenue / totalRevenue) * 100) : 0;
  const atRiskRevenue = allSegments.atRisk.reduce((sum, c) => sum + c.spent, 0);
  const newReturned = allSegments.new.filter(c => c.visits >= 2).length;
  const newReturnRate = allSegments.new.length > 0 ? Math.round((newReturned / allSegments.new.length) * 100) : 0;


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

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Clientes");
    
    // Define columns with proper formatting
    worksheet.columns = [
      { header: "Nome", key: "nome", width: 25 },
      { header: "Telefone", key: "telefone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Status", key: "status", width: 12 },
      { header: "Última Visita", key: "ultima_visita", width: 15 },
      { header: "Total Gasto", key: "total_gasto", width: 18 },
      { header: "Ticket Médio", key: "ticket_medio", width: 18 },
      { header: "Visitas", key: "visitas", width: 10 },
      { header: "Data de Nascimento", key: "nascimento", width: 15 },
    ];
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    });
    
    // Add data rows
    recentClients.forEach(client => {
      const ticketMedio = client.visits > 0 ? client.spent / client.visits : 0;
      const row = worksheet.addRow({
        nome: client.name,
        telefone: client.phone || "-",
        email: client.email || "-",
        status: client.status,
        ultima_visita: client.lastVisitDate ? format(client.lastVisitDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
        total_gasto: client.spent,
        ticket_medio: ticketMedio,
        visitas: client.visits,
        nascimento: client.birthDate ? format(new Date(client.birthDate), "dd/MM/yyyy", { locale: ptBR }) : "-",
      });
      
      // Apply Brazilian currency format
      row.getCell('total_gasto').numFmt = '"R$" #,##0.00';
      row.getCell('ticket_medio').numFmt = '"R$" #,##0.00';
    });
    
    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Status colors for PDF (RGB values)
  const pdfStatusColors: Record<ClientStatus, [number, number, number]> = {
    "VIP": [212, 175, 55], // Gold
    "Em Risco": [234, 179, 8], // Yellow/Amber
    "Perdido": [220, 38, 38], // Red
    "Ativo": [34, 197, 94], // Green
    "Novo": [59, 130, 246], // Blue
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
    
    if (selectedSegment !== "all") {
      doc.text(`Filtro: ${selectedSegment}`, pageWidth / 2, filterByPeriod ? 40 : 34, { align: "center" });
    }

    // Summary
    const yPos = filterByPeriod ? (selectedSegment !== "all" ? 50 : 44) : (selectedSegment !== "all" ? 44 : 38);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${recentClients.length} clientes`, 14, yPos);
    doc.text(`Faturamento: R$ ${recentClients.reduce((s, c) => s + c.spent, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pageWidth - 14, yPos, { align: "right" });

    // Clients table with requested fields
    const tableData = recentClients.map(client => {
      const ticketMedio = client.visits > 0 ? client.spent / client.visits : 0;
      return [
        client.lastVisitDate ? format(client.lastVisitDate, "dd/MM/yyyy", { locale: ptBR }) : "Nunca",
        client.name,
        client.email || "-",
        `R$ ${client.spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        `R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        client.visits.toString(),
        client.phone || "-",
        client.status,
      ];
    });

    autoTable(doc, {
      startY: yPos + 8,
      head: [["Última Visita", "Nome", "Email", "Total Gasto", "Ticket Médio", "Visitas", "Contato", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
      margin: { left: 10, right: 10 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 14 },
        6: { cellWidth: 25 },
        7: { cellWidth: 18 },
      },
      didParseCell: (data) => {
        // Apply colors to status column (index 7)
        if (data.section === 'body' && data.column.index === 7) {
          const status = data.cell.raw as ClientStatus;
          const color = pdfStatusColors[status];
          if (color) {
            data.cell.styles.textColor = color;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    doc.save(`clientes-${format(new Date(), "yyyy-MM-dd")}.pdf`);
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
      
      {/* Segment Filter Indicator */}
      {selectedSegment !== "all" && (
        <div className="flex items-center gap-2 animate-fade-in">
          <Badge variant="secondary" className="gap-1">
            Filtro ativo: {selectedSegment}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedSegment("all")}
            className="h-6 px-2 text-xs"
          >
            Limpar filtro
          </Button>
        </div>
      )}

      {/* Segment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SegmentCard
          icon={Trophy}
          iconColor="text-primary"
          title="Clientes VIP"
          count={allSegments.vip.length}
          subtitle={`${vipPercentage}% do faturamento`}
          actionLabel={selectedSegment === "VIP" ? "Mostrando VIPs" : "Ver lista"}
          onAction={() => setSelectedSegment(selectedSegment === "VIP" ? "all" : "VIP")}
          className={`[animation-delay:200ms] ${selectedSegment === "VIP" ? "ring-2 ring-primary" : ""}`}
        />
        
        <SegmentCard
          icon={AlertTriangle}
          iconColor="text-warning"
          title="Em Risco"
          count={allSegments.atRisk.length}
          subtitle={`R$ ${atRiskRevenue.toLocaleString("pt-BR")} em risco`}
          actionLabel={selectedSegment === "Em Risco" ? "Mostrando Em Risco" : "Recuperar agora"}
          onAction={() => setSelectedSegment(selectedSegment === "Em Risco" ? "all" : "Em Risco")}
          className={`[animation-delay:300ms] ${selectedSegment === "Em Risco" ? "ring-2 ring-warning" : ""}`}
        />
        
        <SegmentCard
          icon={UserX}
          iconColor="text-destructive"
          title="Perdidos"
          count={allSegments.lost.length}
          subtitle="Sem vir há 60+ dias"
          actionLabel={selectedSegment === "Perdido" ? "Mostrando Perdidos" : "Campanha de reativação"}
          onAction={() => setSelectedSegment(selectedSegment === "Perdido" ? "all" : "Perdido")}
          className={`[animation-delay:400ms] ${selectedSegment === "Perdido" ? "ring-2 ring-destructive" : ""}`}
        />
        
        <SegmentCard
          icon={Sparkles}
          iconColor="text-success"
          title="Novos Clientes"
          count={allSegments.new.length}
          subtitle={`${newReturned} retornaram (${newReturnRate}%)`}
          actionLabel={selectedSegment === "Novo" ? "Mostrando Novos" : "Ver retenção"}
          onAction={() => setSelectedSegment(selectedSegment === "Novo" ? "all" : "Novo")}
          className={`[animation-delay:500ms] ${selectedSegment === "Novo" ? "ring-2 ring-success" : ""}`}
        />
      </div>

      
      {/* Clients List */}
      <div className="glass rounded-xl p-5 animate-slide-up [animation-delay:600ms]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-foreground">
              {selectedSegment !== "all" 
                ? `Clientes ${selectedSegment}` 
                : filterByPeriod 
                  ? "Clientes no Período" 
                  : "Clientes Recentes"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedSegment !== "all"
                ? `Filtrando por status: ${selectedSegment}`
                : filterByPeriod 
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
              {selectedSegment !== "all"
                ? `Nenhum cliente com status "${selectedSegment}".`
                : filterByPeriod 
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
