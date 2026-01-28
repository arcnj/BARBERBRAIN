import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCommissions } from "@/hooks/useCommissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isToday, isTomorrow, addDays, setHours, setMinutes, isSameDay, getMonth, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Clock, User, Scissors, Phone, CheckCircle, XCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, Cake, ArrowRight, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppButton } from "@/components/ui/whatsapp-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvailableTimeSlots } from "./AvailableTimeSlots";
import { TodayAppointments } from "./TodayAppointments";

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
    avatar_url: string | null;
    birth_date: string | null;
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

const statusConfig: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pendente", color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50", icon: AlertCircle },
  confirmed: { label: "Confirmado", color: "text-blue-400", bgColor: "bg-blue-500/20 border-blue-500/50", icon: CheckCircle },
  in_progress: { label: "Em Andamento", color: "text-primary", bgColor: "bg-primary/20 border-primary/50", icon: Clock },
  completed: { label: "Concluído", color: "text-green-400", bgColor: "bg-green-500/20 border-green-500/50", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/50", icon: XCircle },
};

// Generate time slots from 7:00 to 21:00 (only full hours for compact view)
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 7; hour <= 21; hour++) {
    slots.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function AgendaTab() {
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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
  
  // Confirmation dialogs state
  const [confirmAction, setConfirmAction] = useState<{
    type: "complete" | "cancel";
    orderId: string;
    cancelReason?: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const isAdmin = role === "admin";
  const { registerCommissions } = useCommissions();

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

  // Fetch orders for selected date
  const {
    data: allOrders,
    isLoading,
    isFetching,
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
            phone,
            avatar_url,
            birth_date
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

  // Group orders by hour slot
  const ordersBySlot = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    
    allOrders?.forEach(order => {
      const orderDate = new Date(order.scheduled_at);
      const hour = orderDate.getHours();
      const slotKey = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!grouped[slotKey]) {
        grouped[slotKey] = [];
      }
      grouped[slotKey].push(order);
    });
    
    return grouped;
  }, [allOrders]);

  // Fetch services for the new appointment form
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
    staleTime: 60000,
    enabled: isDialogOpen,
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
    mutationFn: async ({ orderId, status, orderData }: { 
      orderId: string; 
      status: OrderStatus;
      orderData?: Order;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;

      // If completing an order, register commissions automatically
      if (status === "completed" && orderData?.barber_id && orderData?.scheduled_at) {
        const serviceTotal = orderData.order_items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0;
        const productTotal = orderData.order_products?.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0) || 0;

        if (serviceTotal > 0 || productTotal > 0) {
          await registerCommissions.mutateAsync({
            orderId,
            barberId: orderData.barber_id,
            scheduledAt: orderData.scheduled_at,
            serviceTotal,
            productTotal
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-orders"] });
      queryClient.invalidateQueries({ queryKey: ["barber-financial-records"] });
      toast.success("Status atualizado!");
      setSelectedOrder(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      let customerId: string;
      
      if (newAppointment.customerId) {
        customerId = newAppointment.customerId;
      } else {
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

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: walkInUserId,
            role: "customer" as const,
          });

        if (roleError) {
          console.error("Error creating role:", roleError);
        }

        customerId = walkInUserId;
        toast.success(`Novo cliente "${newAppointment.customerName}" cadastrado!`);
      }

      const service = services?.find(s => s.id === newAppointment.serviceId);
      if (!service) throw new Error("Service not found");

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

  const goToPreviousDay = () => setSelectedDate(addDays(selectedDate, -1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const handleSlotClick = (hour: number, minute: number) => {
    const scheduledAt = setMinutes(setHours(selectedDate, hour), minute);
    setNewAppointment(prev => ({ ...prev, scheduledAt }));
    setIsDialogOpen(true);
  };

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

  const pendingCount = allOrders?.filter(o => ["pending", "confirmed", "in_progress"].includes(o.status)).length || 0;
  const completedCount = allOrders?.filter(o => o.status === "completed").length || 0;

  // Get next upcoming appointment for the selected day
  const nextAppointment = useMemo(() => {
    if (!allOrders) return null;

    const referenceTime = isToday(selectedDate) ? new Date() : startOfDay(selectedDate);

    const upcoming = allOrders
      .filter(
        (o) =>
          new Date(o.scheduled_at) >= referenceTime &&
          !["completed", "cancelled"].includes(o.status),
      )
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return upcoming[0] || null;
  }, [allOrders, selectedDate]);

  // Check if it's the customer's birthday
  const isBirthday = (birthDate: string | null | undefined) => {
    if (!birthDate) return false;
    const today = new Date();
    const birth = new Date(birthDate);
    return getMonth(today) === getMonth(birth) && getDate(today) === getDate(birth);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    
    if (confirmAction.type === "complete") {
      // Find the order data to pass for commission calculation
      const orderData = allOrders?.find(o => o.id === confirmAction.orderId);
      updateStatusMutation.mutate({ 
        orderId: confirmAction.orderId, 
        status: "completed",
        orderData 
      });
    } else {
      updateStatusMutation.mutate({ orderId: confirmAction.orderId, status: "cancelled" });
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-4">
      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "complete" ? "Finalizar atendimento?" : "Cancelar agendamento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "complete" 
                ? "Tem certeza que deseja finalizar este atendimento? Esta ação não pode ser desfeita."
                : `Tem certeza que deseja cancelar? Motivo: ${confirmAction?.cancelReason || "Não informado"}`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={
                confirmAction?.type === "complete"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {confirmAction?.type === "complete" ? "Sim, finalizar" : "Sim, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Next Client Card - Always visible */}
      <Card
        className={cn(
          "border-2 overflow-visible",
          nextAppointment && isBirthday(nextAppointment.profiles?.birth_date)
            ? "border-pink-500 bg-gradient-to-r from-pink-500/10 to-purple-500/10"
            : nextAppointment
              ? "border-primary/50 bg-primary/5"
              : "border-muted bg-muted/5",
        )}
      >
        <CardContent className="p-4">
          {nextAppointment ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-primary">
                  <AvatarImage src={nextAppointment.profiles?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {nextAppointment.profiles?.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                {isBirthday(nextAppointment.profiles?.birth_date) && (
                  <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1 animate-bounce">
                    <Cake className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Próximo cliente</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-primary">{format(new Date(nextAppointment.scheduled_at), "HH:mm")}</span>
                </div>

                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg truncate">{nextAppointment.profiles?.full_name || "Cliente"}</h3>
                  {isBirthday(nextAppointment.profiles?.birth_date) && (
                    <Badge className="bg-pink-500 text-white border-0 animate-pulse">🎂 Aniversário!</Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {nextAppointment.order_items.map((item) => (
                    <Badge key={item.id} variant="secondary" className="text-xs">
                      <Scissors className="h-3 w-3 mr-1" />
                      {item.services?.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price & Actions */}
              <div className="flex w-full flex-row items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                <div className="text-2xl font-bold text-primary">R$ {(nextAppointment.total_price || 0).toFixed(0)}</div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => setConfirmAction({ type: "complete", orderId: nextAppointment.id })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Finalizar
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={updateStatusMutation.isPending}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() =>
                          setConfirmAction({
                            type: "cancel",
                            orderId: nextAppointment.id,
                            cancelReason: "Cliente cancelou",
                          })
                        }
                      >
                        Cliente cancelou
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          setConfirmAction({
                            type: "cancel",
                            orderId: nextAppointment.id,
                            cancelReason: "Cliente não veio",
                          })
                        }
                      >
                        Cliente não veio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          setConfirmAction({
                            type: "cancel",
                            orderId: nextAppointment.id,
                            cancelReason: "Cancelado pelo barbeiro",
                          })
                        }
                      >
                        Cancelado pelo barbeiro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 py-2">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
                <CalendarOff className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <div className="flex-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Próximo cliente</span>
                <p className="text-muted-foreground font-medium mt-1">
                  Nenhum agendamento pendente para este dia
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header with navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[140px] sm:min-w-[200px] justify-center capitalize">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {getDateLabel(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {!isToday(selectedDate) && (
            <Button variant="ghost" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          )}

          {/* Today's Appointments Popover */}
          {isToday(selectedDate) && allOrders && (
            <TodayAppointments orders={allOrders} isLoading={isLoading} />
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{pendingCount}</span> pendente{pendingCount !== 1 ? "s" : ""} • 
            <span className="font-medium text-foreground ml-1">{completedCount}</span> finalizado{completedCount !== 1 ? "s" : ""}
          </div>
          
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
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
                  <Label>Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newAppointment.scheduledAt, "dd/MM/yyyy", { locale: ptBR })}
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
                </div>

                <AvailableTimeSlots
                  selectedDate={newAppointment.scheduledAt}
                  selectedTime={format(newAppointment.scheduledAt, "HH:mm")}
                  onSelectTime={(time) => {
                    const [hours, minutes] = time.split(":").map(Number);
                    const newDate = new Date(newAppointment.scheduledAt);
                    newDate.setHours(hours, minutes);
                    setNewAppointment({ ...newAppointment, scheduledAt: newDate });
                  }}
                  barberId={barberId}
                  serviceDuration={services?.find(s => s.id === newAppointment.serviceId)?.duration_minutes || 30}
                />

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
                    "Confirmar Agendamento"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar Grid - Compact View */}
      <Card className="overflow-hidden">
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-[60px_1fr]">
            {TIME_SLOTS.map((slot) => {
              const slotKey = slot.label;
              const slotOrders = ordersBySlot[slotKey] || [];
              const isCurrentHour = isToday(selectedDate) && new Date().getHours() === slot.hour;

              return (
                <div key={slotKey} className="contents">
                  {/* Time label */}
                  <div className={cn(
                    "py-2 px-2 text-xs font-medium border-b border-r border-border text-right",
                    isCurrentHour ? "text-primary bg-primary/5" : "text-muted-foreground"
                  )}>
                    {slot.label}
                  </div>

                  {/* Slot content */}
                  <div 
                    className={cn(
                      "min-h-[44px] py-1 px-2 border-b border-border cursor-pointer transition-colors flex items-center gap-2 flex-wrap",
                      isCurrentHour && "bg-primary/5",
                      slotOrders.length === 0 && "hover:bg-muted/30"
                    )}
                    onClick={() => slotOrders.length === 0 && handleSlotClick(slot.hour, 0)}
                  >
                    {slotOrders.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50 opacity-0 hover:opacity-100">+ Agendar</span>
                    ) : (
                      slotOrders.map((order) => {
                        const StatusIcon = statusConfig[order.status].icon;
                        const totalDuration = order.order_items.reduce(
                          (acc, item) => acc + (item.services?.duration_minutes || 30),
                          0
                        );
                        const serviceName = order.order_items[0]?.services?.name || "Serviço";
                        const orderTime = format(new Date(order.scheduled_at), "HH:mm");

                        return (
                          <div
                            key={order.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded border cursor-pointer transition-all hover:shadow-sm text-sm flex-1 min-w-[180px]",
                              statusConfig[order.status].bgColor
                            )}
                          >
                            <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", statusConfig[order.status].color)} />
                            <span className="text-xs text-muted-foreground">{orderTime}</span>
                            <span className="font-medium truncate flex-1">
                              {order.profiles?.full_name || "Cliente"}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {serviceName} • {totalDuration}min
                            </span>
                            {order.total_price && (
                              <span className="font-semibold text-primary text-sm">
                                R$ {order.total_price.toFixed(0)}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {format(new Date(selectedOrder.scheduled_at), "HH:mm")} - {selectedOrder.profiles?.full_name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge className={cn("border", statusConfig[selectedOrder.status].bgColor, statusConfig[selectedOrder.status].color)}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                  {selectedOrder.total_price && (
                    <span className="text-lg font-bold text-primary ml-auto">
                      R$ {selectedOrder.total_price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.profiles?.full_name}</span>
                  </div>
                  {selectedOrder.profiles?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.profiles.phone}</span>
                      <WhatsAppButton 
                        phone={selectedOrder.profiles.phone} 
                        name={selectedOrder.profiles.full_name}
                      />
                    </div>
                  )}
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.order_items.map((item) => (
                      <Badge key={item.id} variant="secondary">
                        {item.services?.name} - R$ {item.price.toFixed(2)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Barber */}
                {selectedOrder.barbers?.name && (
                  <div className="space-y-2">
                    <Label>Barbeiro</Label>
                    <p className="text-sm">{selectedOrder.barbers.name}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedOrder.status === "pending" && (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "confirmed" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Confirmar
                    </Button>
                  )}
                  {selectedOrder.status === "confirmed" && (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "in_progress" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Iniciar
                    </Button>
                  )}
                  {selectedOrder.status === "in_progress" && (
                    <Button
                      onClick={() => updateStatusMutation.mutate({ 
                        orderId: selectedOrder.id, 
                        status: "completed",
                        orderData: selectedOrder 
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Concluir
                    </Button>
                  )}
                  {(selectedOrder.status === "pending" || selectedOrder.status === "confirmed") && (
                    <Button
                      variant="destructive"
                      onClick={() => updateStatusMutation.mutate({ orderId: selectedOrder.id, status: "cancelled" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
