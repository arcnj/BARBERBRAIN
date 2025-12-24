import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isToday, isTomorrow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Clock, User, Scissors, Phone, CheckCircle, XCircle, AlertCircle, Package, RefreshCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";

type OrderStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    customerName: "",
    customerPhone: "",
    serviceId: "",
    scheduledAt: new Date(),
    notes: "",
  });

  const queryClient = useQueryClient();

  // Fetch orders for selected date
  const {
    data: orders,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["agenda-orders", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
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
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as unknown as Order[];
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

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

  // Fetch profiles for customer search (only when dialog opens)
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .order("full_name")
        .limit(100);

      if (error) throw error;
      return data;
    },
    staleTime: 60000, // Cache for 1 minute
    enabled: isDialogOpen, // Only fetch when dialog is open
  });

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

  // Create appointment mutation (for walk-in clients)
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // First, find or create the customer
      let customerId: string;
      
      const existingCustomer = customers?.find(
        c => c.phone === newAppointment.customerPhone || 
             c.full_name.toLowerCase() === newAppointment.customerName.toLowerCase()
      );

      if (existingCustomer) {
        customerId = existingCustomer.user_id;
      } else {
        // For walk-in clients without an account, we need to create a temporary profile
        // This requires admin privileges - for now, use an existing customer
        toast.error("Cliente não encontrado. O cliente precisa ter uma conta.");
        throw new Error("Customer not found");
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
        serviceId: "",
        scheduledAt: new Date(),
        notes: "",
      });
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

  return (
    <div className="space-y-6">
      {/* Header with date selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold capitalize">{getDateLabel(selectedDate)}</h2>
          <p className="text-muted-foreground">
            {orders?.length || 0} agendamento{orders?.length !== 1 ? "s" : ""}
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
                  <Label>Cliente</Label>
                  <Select
                    value={newAppointment.customerName}
                    onValueChange={(value) => {
                      const customer = customers?.find(c => c.user_id === value);
                      setNewAppointment({
                        ...newAppointment,
                        customerName: customer?.full_name || "",
                        customerPhone: customer?.phone || "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.user_id} value={customer.user_id}>
                          {customer.full_name} {customer.phone && `- ${customer.phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  disabled={!newAppointment.customerName || !newAppointment.serviceId}
                >
                  Confirmar Encaixe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
      ) : (orders?.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum agendamento</p>
            <p className="text-muted-foreground text-sm mb-4">
              Não há agendamentos para esta data
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {isToday(selectedDate) && (
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
                          <div className="flex items-center gap-2">
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
    </div>
  );
}
