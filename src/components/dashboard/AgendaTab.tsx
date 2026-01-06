import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isToday, isTomorrow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Clock, User, Scissors, Phone, CheckCircle, XCircle, AlertCircle, Package, RefreshCcw, Loader2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";

type OrderStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
type TabType = "pending" | "completed" | "cancelled";

interface Order {
  id: string;
  scheduled_at: string;
  status: OrderStatus;
  notes: string | null;
  total_price: number | null;
  customer_id: string;
  barber_id: string | null;
  profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  barbers: {
    name: string;
  } | null;
  order_items: {
    id: string;
    price: number;
    services: {
      name: string;
      duration_minutes: number | null;
    } | null;
  }[];
  order_products: {
    id: string;
    price: number;
    quantity: number;
    products: {
      name: string;
    } | null;
  }[];
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: AlertCircle },
  confirmed: { label: "Confirmado", color: "bg-blue-500/20 text-blue-400 border-blue-500/50", icon: CheckCircle },
  in_progress: { label: "Em Andamento", color: "bg-primary/20 text-primary border-primary/50", icon: Clock },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/50", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/50", icon: XCircle },
};

export function AgendaTab() {
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    customerName: "",
    customerPhone: "",
    customerId: "" as string | null,
    serviceId: "",
    scheduledAt: new Date(),
    notes: "",
  });
  const [phoneSearchResult, setPhoneSearchResult] = useState<{
    found: boolean;
    customer: { user_id: string; full_name: string; phone: string } | null;
  } | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const queryClient = useQueryClient();

  const isAdmin = role === "admin";

  // Fetch barber ID for current user (if they are a barber)
  const { data: currentBarber, isLoading: loadingBarber } = useQuery({
    queryKey: ["current-barber", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && role === "barber",
  });

  const barberId = currentBarber?.id;

  // Fetch orders for selected date - filtered by barber if not admin
  const {
    data: allOrders,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agenda-orders", format(selectedDate, "yyyy-MM-dd"), barberId, isAdmin],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();

      let query = supabase
        .from("orders")
        .select(`
          id,
          scheduled_at,
          status,
          notes,
          total_price,
          customer_id,
          barber_id,
          profiles!orders_customer_id_profiles_fkey (
            full_name,
            phone
          ),
          barbers!orders_barber_id_fkey (
            name
          ),
          order_items (
            id,
            price,
            services (
              name,
              duration_minutes
            )
          ),
          order_products (
            id,
            price,
            quantity,
            products (
              name
            )
          )
        `)
        .gte("scheduled_at", startDate)
        .lte("scheduled_at", endDate)
        .order("scheduled_at", { ascending: true });

      // If barber (not admin), filter by their barber_id or preferred_barber_id
      if (!isAdmin && barberId) {
        query = query.or(`barber_id.eq.${barberId},preferred_barber_id.eq.${barberId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as Order[];
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    enabled: isAdmin || !!barberId,
  });

  // Filter orders by tab
  const pendingStatuses: OrderStatus[] = ["pending", "confirmed", "in_progress"];
  const pendingOrders = allOrders?.filter(o => pendingStatuses.includes(o.status)) || [];
  const completedOrders = allOrders?.filter(o => o.status === "completed") || [];
  const cancelledOrders = allOrders?.filter(o => o.status === "cancelled") || [];

  const getOrdersForTab = () => {
    switch (activeTab) {
      case "pending": return pendingOrders;
      case "completed": return completedOrders;
      case "cancelled": return cancelledOrders;
    }
  };

  const orders = getOrdersForTab();

  // Fetch services for the new appointment form (only when dialog opens)
  const { data: services } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: isDialogOpen, // Only fetch when dialog is open
  });

  // Search customer by phone
  const searchCustomerByPhone = async (phone: string) => {
    if (phone.length < 8) {
      setPhoneSearchResult(null);
      setNewAppointment(prev => ({ ...prev, customerId: null, customerName: "" }));
      return;
    }

    setIsSearchingPhone(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .eq("phone", phone)
        .limit(1);

      if (error) throw error;

      const customer = data?.[0];

      if (customer) {
        setPhoneSearchResult({ found: true, customer });
        setNewAppointment(prev => ({
          ...prev,
          customerId: customer.user_id,
          customerName: customer.full_name,
        }));
      } else {
        setPhoneSearchResult({ found: false, customer: null });
        setNewAppointment(prev => ({ ...prev, customerId: null }));
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      setPhoneSearchResult(null);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Complete all pending orders mutation
  const completeAllMutation = useMutation({
    mutationFn: async () => {
      const ordersToComplete = pendingOrders.filter(o => o.status !== "cancelled");
      
      if (ordersToComplete.length === 0) {
        throw new Error("Nenhum agendamento para finalizar");
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "completed" as OrderStatus })
        .in("id", ordersToComplete.map(o => o.id));

      if (error) throw error;
      
      return ordersToComplete.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      toast.success(`${count} agendamento${count !== 1 ? "s" : ""} finalizado${count !== 1 ? "s" : ""}!`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao finalizar agendamentos");
    },
  });

  // Create appointment mutation (for walk-in clients)
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      let customerId: string;
      
      // If customer was found by phone search
      if (newAppointment.customerId) {
        customerId = newAppointment.customerId;
      } else {
        // Create new customer profile
        // First, we need to create a user in auth - but since we can't do that directly,
        // we'll create a profile with a generated user_id for walk-in clients
        const walkInUserId = crypto.randomUUID();
        
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: walkInUserId,
            full_name: newAppointment.customerName,
            phone: newAppointment.customerPhone,
          });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          toast.error("Erro ao criar perfil do cliente");
          throw profileError;
        }

        // Also create a customer role for this user
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: walkInUserId,
            role: "customer" as const,
          });

        if (roleError) {
          console.error("Error creating role:", roleError);
          // Continue anyway, role is not critical for the order
        }

        customerId = walkInUserId;
        toast.success(`Novo cliente "${newAppointment.customerName}" cadastrado!`);
      }

      const service = services?.find(s => s.id === newAppointment.serviceId);
      if (!service) throw new Error("Service not found");

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          scheduled_at: newAppointment.scheduledAt.toISOString(),
          status: "confirmed" as OrderStatus,
          notes: newAppointment.notes || null,
          total_price: service.price,
          barber_id: barberId || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create the order item
      const { error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: order.id,
          service_id: newAppointment.serviceId,
          price: service.price,
        });

      if (itemError) throw itemError;

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      toast.success("Agendamento criado!");
      setIsDialogOpen(false);
      setNewAppointment({
        customerName: "",
        customerPhone: "",
        customerId: null,
        serviceId: "",
        scheduledAt: new Date(),
        notes: "",
      });
      setPhoneSearchResult(null);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const quickDates = [
    { label: "Hoje", date: new Date() },
    { label: "Amanhã", date: addDays(new Date(), 1) },
    { label: format(addDays(new Date(), 2), "EEE", { locale: ptBR }), date: addDays(new Date(), 2) },
    { label: format(addDays(new Date(), 3), "EEE", { locale: ptBR }), date: addDays(new Date(), 3) },
  ];

  // If barber but no barber record linked, show message
  if (role === "barber" && !barberId && !loadingBarber && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="font-display font-semibold text-foreground">Conta não vinculada</h3>
          <p className="text-muted-foreground">
            Seu usuário ainda não está vinculado a um perfil de barbeiro.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Peça ao administrador para criar seu login na aba Barbeiros.
          </p>
        </div>
      </div>
    );
  }

  if (loadingBarber) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold capitalize">{getDateLabel(selectedDate)}</h2>
          <p className="text-muted-foreground">
            {pendingOrders.length} pendente{pendingOrders.length !== 1 ? "s" : ""} • {completedOrders.length} finalizado{completedOrders.length !== 1 ? "s" : ""} • {cancelledOrders.length} cancelado{cancelledOrders.length !== 1 ? "s" : ""}
            {!isAdmin && currentBarber && (
              <span className="text-primary ml-2">• Sua agenda</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick date buttons */}
          <div className="flex gap-1">
            {quickDates.map((item, index) => (
              <Button
                key={index}
                variant={format(selectedDate, "yyyy-MM-dd") === format(item.date, "yyyy-MM-dd") ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(item.date)}
                className="capitalize"
              >
                {item.label}
              </Button>
            ))}
          </div>

          {/* Calendar picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Atualizar agenda"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>

          {/* Add appointment button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Encaixar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Encaixar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Telefone do Cliente</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      value={newAppointment.customerPhone}
                      onChange={(e) => {
                        const phone = e.target.value;
                        setNewAppointment({ ...newAppointment, customerPhone: phone });
                        searchCustomerByPhone(phone);
                      }}
                    />
                    {isSearchingPhone && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {phoneSearchResult?.found && (
                    <div className="text-sm px-3 py-2 rounded-md bg-green-500/10 text-green-400 border border-green-500/30">
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Cliente encontrado: {phoneSearchResult.customer?.full_name}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome completo"
                      className="pl-10"
                      value={newAppointment.customerName}
                      onChange={(e) => setNewAppointment({ ...newAppointment, customerName: e.target.value })}
                      disabled={phoneSearchResult?.found}
                    />
                  </div>
                  {phoneSearchResult?.found && (
                    <p className="text-xs text-muted-foreground">
                      Nome preenchido automaticamente do cadastro
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Serviço</Label>
                  <Select
                    value={newAppointment.serviceId}
                    onValueChange={(value) =>
                      setNewAppointment({ ...newAppointment, serviceId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - R$ {service.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="flex-1 justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(newAppointment.scheduledAt, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newAppointment.scheduledAt}
                          onSelect={(date) =>
                            date && setNewAppointment({
                              ...newAppointment,
                              scheduledAt: new Date(
                                date.getFullYear(),
                                date.getMonth(),
                                date.getDate(),
                                newAppointment.scheduledAt.getHours(),
                                newAppointment.scheduledAt.getMinutes()
                              ),
                            })
                          }
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <Input
                      type="time"
                      className="w-32"
                      value={format(newAppointment.scheduledAt, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":").map(Number);
                        const newDate = new Date(newAppointment.scheduledAt);
                        newDate.setHours(hours, minutes);
                        setNewAppointment({ ...newAppointment, scheduledAt: newDate });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações sobre o atendimento..."
                    value={newAppointment.notes}
                    onChange={(e) =>
                      setNewAppointment({ ...newAppointment, notes: e.target.value })
                    }
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => createAppointmentMutation.mutate()}
                  disabled={
                    !newAppointment.customerName || 
                    !newAppointment.customerPhone || 
                    !newAppointment.serviceId ||
                    createAppointmentMutation.isPending
                  }
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Confirmar Encaixe"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs for different statuses */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Pendentes ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Finalizados ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelados ({cancelledOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Complete All Button - only show in pending tab when there are pending orders */}
          {activeTab === "pending" && pendingOrders.length > 0 && (
            <Button
              variant="success"
              size="sm"
              onClick={() => completeAllMutation.mutate()}
              disabled={completeAllMutation.isPending}
              className="gap-2"
            >
              {completeAllMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Finalizar Todos ({pendingOrders.length})
                </>
              )}
            </Button>
          )}
        </div>

        <TabsContent value={activeTab} className="mt-4">
          {/* Appointments list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Erro ao carregar a agenda</p>
                <p className="text-muted-foreground text-sm mb-4">
                  Tente atualizar para buscar os pedidos mais recentes.
                </p>
                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </Button>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {activeTab === "pending" && "Nenhum agendamento pendente"}
                  {activeTab === "completed" && "Nenhum atendimento finalizado"}
                  {activeTab === "cancelled" && "Nenhum agendamento cancelado"}
                </p>
                <p className="text-muted-foreground text-sm mb-4">
                  Não há registros para esta data
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {isToday(selectedDate) && activeTab === "pending" && (
                    <Button variant="default" onClick={() => setSelectedDate(addDays(new Date(), 1))}>
                      Ver amanhã
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => refetch()} className="gap-2">
                    <RefreshCcw className="h-4 w-4" />
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
        <div className="space-y-4">
          {orders?.map((order) => {
            const StatusIcon = statusConfig[order.status].icon;
            const totalDuration = order.order_items.reduce(
              (acc, item) => acc + (item.services?.duration_minutes || 30),
              0
            );

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Time column */}
                    <div className="bg-muted/50 p-4 flex flex-col items-center justify-center min-w-[100px] border-r border-border">
                      <span className="text-2xl font-bold">
                        {format(new Date(order.scheduled_at), "HH:mm")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {totalDuration} min
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          {/* Customer info */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {order.profiles?.full_name || "Cliente"}
                            </span>
                            {order.profiles?.phone && (
                              <>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {order.profiles.phone}
                                </span>
                                <WhatsAppButton 
                                  phone={order.profiles.phone} 
                                  name={order.profiles.full_name}
                                />
                              </>
                            )}
                            {order.barbers?.name && (
                              <Badge variant="outline" className="ml-2">
                                <Scissors className="h-3 w-3 mr-1" />
                                {order.barbers.name}
                              </Badge>
                            )}
                          </div>

                          {/* Services */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Scissors className="h-4 w-4 text-muted-foreground" />
                            {order.order_items.map((item) => (
                              <Badge key={item.id} variant="secondary">
                                {item.services?.name || "Serviço"}
                              </Badge>
                            ))}
                          </div>

                          {/* Products */}
                          {order.order_products && order.order_products.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              {order.order_products.map((item) => (
                                <Badge key={item.id} variant="outline" className="border-primary/50 text-primary">
                                  {item.quantity}x {item.products?.name || "Produto"}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Notes */}
                          {order.notes && (
                            <p className="text-sm text-muted-foreground">
                              {order.notes}
                            </p>
                          )}
                        </div>

                        {/* Status and actions */}
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={cn("border", statusConfig[order.status].color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[order.status].label}
                          </Badge>

                          {order.total_price && (
                            <span className="text-lg font-bold text-primary">
                              R$ {order.total_price.toFixed(2)}
                            </span>
                          )}

                          {/* Quick status actions */}
                          <div className="flex gap-1">
                            {order.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: "confirmed",
                                  })
                                }
                              >
                                Confirmar
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: "in_progress",
                                  })
                                }
                              >
                                Iniciar
                              </Button>
                            )}
                            {order.status === "in_progress" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: "completed",
                                  })
                                }
                              >
                                Concluir
                              </Button>
                            )}
                            {(order.status === "pending" || order.status === "confirmed") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: "cancelled",
                                  })
                                }
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
