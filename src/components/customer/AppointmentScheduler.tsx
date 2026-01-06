import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, addDays, setHours, setMinutes, isBefore, isAfter, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2, Scissors, User, Check, Gift, Cake, Percent, BadgeDollarSign, MessageCircle } from "lucide-react";

// Barbershop WhatsApp number - can be configured
const BARBERSHOP_WHATSAPP = "5511999999999"; // TODO: Get from settings

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
}

interface ServiceCombo {
  id: string;
  name: string;
  description: string | null;
  promotional_price: number;
  original_price: number;
  max_redemptions: number | null;
  current_redemptions: number;
  services: Service[];
}

interface Barber {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface SelectedProduct {
  id: string;
  name: string;
  price: number;
}

interface BirthdayCoupon {
  id: string;
  discount_percentage: number | null;
  discount_value: number | null;
  valid_from: string;
  valid_until: string;
  used: boolean;
}

interface AppointmentSchedulerProps {
  selectedProducts?: SelectedProduct[];
  birthdayCoupon?: BirthdayCoupon | null;
  onAppointmentCreated: () => void;
}

// Business hours configuration
const OPENING_HOUR = 9;
const CLOSING_HOUR = 19;
const SLOT_DURATION_MINUTES = 30;

export function AppointmentScheduler({ selectedProducts = [], birthdayCoupon, onAppointmentCreated }: AppointmentSchedulerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [combos, setCombos] = useState<ServiceCombo[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<ServiceCombo | null>(null);
  const [preferredBarber, setPreferredBarber] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<{
    date: string;
    time: string;
    services: string[];
    barber: string;
    total: number;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate && preferredBarber) {
      fetchAvailableSlots(selectedDate);
    }
  }, [selectedDate, preferredBarber]);

  // Reset date and time when barber changes
  const handleBarberChange = (barberId: string) => {
    setPreferredBarber(barberId);
    setSelectedTime("");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [servicesRes, barbersRes, combosRes] = await Promise.all([
        supabase.from("services").select("*").eq("active", true).order("category"),
        supabase.from("barbers").select("id, name, avatar_url").eq("active", true),
        supabase.from("service_combos").select("*").eq("active", true),
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (barbersRes.error) throw barbersRes.error;

      setServices(servicesRes.data || []);
      setBarbers(barbersRes.data || []);

      // Fetch services for each combo
      if (combosRes.data && combosRes.data.length > 0) {
        const combosWithServices = await Promise.all(
          combosRes.data.map(async (combo) => {
            const { data: comboServicesData } = await supabase
              .from("combo_services")
              .select("service_id")
              .eq("combo_id", combo.id);

            const serviceIds = (comboServicesData || []).map(cs => cs.service_id);
            
            if (serviceIds.length > 0) {
              const comboServices = (servicesRes.data || []).filter(s => serviceIds.includes(s.id));
              return { ...combo, services: comboServices };
            }
            
            return { ...combo, services: [] };
          })
        );
        
        // Filter combos that still have available slots
        const availableCombos = combosWithServices.filter(
          combo => combo.max_redemptions === null || combo.current_redemptions < combo.max_redemptions
        );
        setCombos(availableCombos);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    setLoadingSlots(true);
    setSelectedTime("");

    try {
      // Get all orders for the selected date
      const startOfSelectedDay = startOfDay(date);
      const endOfSelectedDay = new Date(startOfSelectedDay);
      endOfSelectedDay.setDate(endOfSelectedDay.getDate() + 1);

      let query = supabase
        .from("orders")
        .select("scheduled_at, barber_id")
        .gte("scheduled_at", startOfSelectedDay.toISOString())
        .lt("scheduled_at", endOfSelectedDay.toISOString())
        .in("status", ["pending", "confirmed", "in_progress"]);

      // If a barber is selected, only check their appointments
      if (preferredBarber) {
        query = query.or(`barber_id.eq.${preferredBarber},preferred_barber_id.eq.${preferredBarber}`);
      }

      const { data: bookedOrders, error } = await query;

      if (error) throw error;

      // Generate all possible time slots
      const slots: TimeSlot[] = [];
      const now = new Date();
      const bookedTimes = new Set(
        (bookedOrders || [])
          .filter(order => order.scheduled_at)
          .map(order => format(new Date(order.scheduled_at!), "HH:mm"))
      );

      for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
        for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
          const slotTime = setMinutes(setHours(date, hour), min);
          const timeString = format(slotTime, "HH:mm");

          // Check if slot is in the past
          const isPast = isSameDay(date, now) && isBefore(slotTime, now);
          
          // Check if slot is already booked
          const isBooked = bookedTimes.has(timeString);

          slots.push({
            time: timeString,
            available: !isPast && !isBooked,
          });
        }
      }

      setTimeSlots(slots);
    } catch (err) {
      console.error("Error fetching slots:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os horários",
        variant: "destructive",
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    // If selecting individual services, clear combo
    if (selectedCombo) {
      setSelectedCombo(null);
    }
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSelectCombo = (combo: ServiceCombo) => {
    if (selectedCombo?.id === combo.id) {
      // Deselect combo
      setSelectedCombo(null);
      setSelectedServices([]);
    } else {
      // Select combo and its services
      setSelectedCombo(combo);
      setSelectedServices(combo.services.map(s => s.id));
    }
  };

  const calculateSubtotal = () => {
    // If combo is selected, use promotional price
    if (selectedCombo) {
      const productsTotal = selectedProducts.reduce((total, p) => total + p.price, 0);
      return selectedCombo.promotional_price + productsTotal;
    }
    
    const servicesTotal = selectedServices.reduce((total, serviceId) => {
      const service = services.find((s) => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
    const productsTotal = selectedProducts.reduce((total, p) => total + p.price, 0);
    return servicesTotal + productsTotal;
  };

  const calculateDiscount = () => {
    if (!birthdayCoupon) return 0;
    const subtotal = calculateSubtotal();
    if (birthdayCoupon.discount_percentage) {
      return subtotal * (birthdayCoupon.discount_percentage / 100);
    }
    if (birthdayCoupon.discount_value) {
      return Math.min(birthdayCoupon.discount_value, subtotal);
    }
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (selectedServices.length === 0) {
      toast({
        title: "Atenção",
        description: "Selecione pelo menos um serviço",
        variant: "destructive",
      });
      return;
    }

    if (!preferredBarber) {
      toast({
        title: "Atenção",
        description: "Selecione um barbeiro",
        variant: "destructive",
      });
      return;
    }

    if (!selectedDate || !selectedTime) {
      toast({
        title: "Atenção",
        description: "Selecione uma data e horário",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const totalPrice = calculateTotal();
      
      // Create scheduled datetime
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const scheduledAt = setMinutes(setHours(selectedDate, hours), minutes);

      // Create the order - set both barber_id and preferred_barber_id for immediate sync
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          barber_id: preferredBarber || null,
          preferred_barber_id: preferredBarber || null,
          total_price: totalPrice,
          notes: notes || null,
          status: "pending",
          scheduled_at: scheduledAt.toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = selectedServices.map((serviceId) => {
        const service = services.find((s) => s.id === serviceId);
        return {
          order_id: order.id,
          service_id: serviceId,
          price: service?.price || 0,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create order products if any
      if (selectedProducts.length > 0) {
        const orderProductItems = selectedProducts.map((product) => ({
          order_id: order.id,
          product_id: product.id,
          price: product.price,
          quantity: 1,
        }));

        const { error: productsError } = await supabase
          .from("order_products")
          .insert(orderProductItems);

        if (productsError) throw productsError;
      }

      // If a combo was used, increment its redemption count
      if (selectedCombo) {
        await supabase
          .from("service_combos")
          .update({ current_redemptions: selectedCombo.current_redemptions + 1 })
          .eq("id", selectedCombo.id);
      }

      // If birthday coupon was used, mark it as used
      if (birthdayCoupon && calculateDiscount() > 0) {
        await supabase
          .from("birthday_coupons")
          .update({ 
            used: true, 
            used_at: new Date().toISOString(),
            order_id: order.id 
          })
          .eq("id", birthdayCoupon.id);
      }

      // Get barber name for the message
      const selectedBarberName = barbers.find(b => b.id === preferredBarber)?.name || "Barbeiro";
      const serviceNames = selectedServices.map(sid => {
        const service = services.find(s => s.id === sid);
        return service?.name || "";
      }).filter(Boolean);

      // Save appointment details for WhatsApp message
      setAppointmentDetails({
        date: format(scheduledAt, "dd/MM/yyyy", { locale: ptBR }),
        time: format(scheduledAt, "HH:mm"),
        services: serviceNames,
        barber: selectedBarberName,
        total: totalPrice,
      });

      // Show success dialog with WhatsApp option
      setShowSuccessDialog(true);

      // Reset form
      setSelectedServices([]);
      setSelectedCombo(null);
      setPreferredBarber("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setNotes("");
      onAppointmentCreated();
    } catch (err) {
      console.error("Error creating order:", err);
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const availableSlots = timeSlots.filter(slot => slot.available);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Combos Section */}
      {combos.length > 0 && (
        <Card className="glass border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              Combos Promocionais
            </CardTitle>
            <CardDescription>Aproveite nossos pacotes com preços especiais!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {combos.map((combo) => {
              const discount = combo.original_price > 0 
                ? Math.round(((combo.original_price - combo.promotional_price) / combo.original_price) * 100)
                : 0;
              const remaining = combo.max_redemptions 
                ? combo.max_redemptions - combo.current_redemptions 
                : null;
              
              return (
                <div
                  key={combo.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer",
                    selectedCombo?.id === combo.id
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-border hover:border-primary/50 bg-background/50"
                  )}
                  onClick={() => handleSelectCombo(combo)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCombo?.id === combo.id}
                        onCheckedChange={() => handleSelectCombo(combo)}
                      />
                      <div>
                        <p className="font-semibold text-foreground">{combo.name}</p>
                        {combo.description && (
                          <p className="text-xs text-muted-foreground">{combo.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">
                          R$ {combo.promotional_price.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <Badge className="bg-green-500 text-white text-xs">
                            -{discount}%
                          </Badge>
                        )}
                      </div>
                      {combo.original_price > 0 && (
                        <span className="text-xs text-muted-foreground line-through">
                          R$ {combo.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {combo.services.map((service) => (
                      <Badge key={service.id} variant="secondary" className="text-xs">
                        {service.name}
                      </Badge>
                    ))}
                  </div>

                  {remaining !== null && remaining <= 20 && (
                    <Badge variant="destructive" className="text-xs">
                      Últimas {remaining} vagas!
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Services Selection */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scissors className="h-5 w-5 text-primary" />
            {combos.length > 0 ? "Ou escolha serviços individuais" : "Escolha os Serviços"}
          </CardTitle>
          <CardDescription>Selecione os serviços desejados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category} className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{category}</p>
              <div className="space-y-2">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                      selectedServices.includes(service.id) && !selectedCombo
                        ? "border-primary bg-primary/5 shadow-sm"
                        : selectedServices.includes(service.id) && selectedCombo
                        ? "border-primary/50 bg-primary/5 opacity-70"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleServiceToggle(service.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => handleServiceToggle(service.id)}
                        disabled={selectedCombo !== null}
                      />
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.duration_minutes} min</p>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">
                      R$ {Number(service.price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum serviço disponível
            </p>
          )}
        </CardContent>
      </Card>

      {/* Barber Selection - Visual Grid */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Selecione um profissional
          </CardTitle>
          <CardDescription>Escolha o barbeiro para ver os horários disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          {barbers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum barbeiro disponível
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {barbers.map((barber) => (
                <div
                  key={barber.id}
                  onClick={() => handleBarberChange(barber.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all",
                    preferredBarber === barber.id
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 transition-colors",
                    preferredBarber === barber.id ? "border-primary" : "border-border"
                  )}>
                    {barber.avatar_url ? (
                      <img 
                        src={barber.avatar_url} 
                        alt={barber.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {preferredBarber === barber.id && (
                      <div className="absolute bottom-0 right-0 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-sm font-medium text-center",
                    preferredBarber === barber.id ? "text-primary" : "text-foreground"
                  )}>
                    {barber.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date Selection - Only show after barber is selected */}
      {preferredBarber && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Escolha a Data
            </CardTitle>
            <CardDescription>Selecione o dia do agendamento</CardDescription>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => isBefore(date, startOfDay(new Date())) || isAfter(date, addDays(new Date(), 30))}
                  initialFocus
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      )}

      {/* Time Slots */}
      {preferredBarber && selectedDate && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Horários Disponíveis
            </CardTitle>
            <CardDescription>
              {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })} - {barbers.find(b => b.id === preferredBarber)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum horário disponível nesta data para este barbeiro
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot.time}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    size="sm"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={cn(
                      "relative",
                      !slot.available && "opacity-50 cursor-not-allowed line-through",
                      selectedTime === slot.time && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {slot.time}
                    {selectedTime === slot.time && (
                      <Check className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
          <CardDescription>Opcional - alguma informação adicional</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ex: Quero corte mais curto nas laterais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      {selectedServices.length > 0 && (
        <Card className="glass border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            {/* Birthday Coupon Applied */}
            {birthdayCoupon && calculateDiscount() > 0 && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Cake className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Cupom de Aniversário Aplicado!
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {birthdayCoupon.discount_percentage 
                    ? `${birthdayCoupon.discount_percentage}% de desconto` 
                    : `R$ ${birthdayCoupon.discount_value?.toFixed(2)} de desconto`}
                </p>
              </div>
            )}

            {/* Products included */}
            {selectedProducts.length > 0 && (
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-foreground mb-2">Produtos incluídos:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedProducts.map((p) => (
                    <span key={p.id} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {p.name} - R$ {p.price.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">R$ {calculateSubtotal().toFixed(2)}</span>
              </div>
              
              {/* Discount */}
              {birthdayCoupon && calculateDiscount() > 0 && (
                <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                  <span className="flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    Desconto Aniversário
                  </span>
                  <span>- R$ {calculateDiscount().toFixed(2)}</span>
                </div>
              )}
              
              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-medium text-foreground">Total</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            {selectedDate && selectedTime && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                📅 {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às {selectedTime}
              </p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || selectedServices.length === 0 || !selectedDate || !selectedTime}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirmar Agendamento
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Success Dialog with WhatsApp option */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Agendamento Confirmado!
            </DialogTitle>
            <DialogDescription>
              Seu horário foi marcado com sucesso.
            </DialogDescription>
          </DialogHeader>
          
          {appointmentDetails && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">📅 Data:</span> {appointmentDetails.date} às {appointmentDetails.time}
                </p>
                <p className="text-sm">
                  <span className="font-medium">✂️ Serviços:</span> {appointmentDetails.services.join(", ")}
                </p>
                <p className="text-sm">
                  <span className="font-medium">💈 Barbeiro:</span> {appointmentDetails.barber}
                </p>
                <p className="text-sm">
                  <span className="font-medium">💰 Total:</span> R$ {appointmentDetails.total.toFixed(2)}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const message = `Olá! 👋\n\nAcabei de fazer um agendamento:\n\n📅 *Data:* ${appointmentDetails.date} às ${appointmentDetails.time}\n✂️ *Serviços:* ${appointmentDetails.services.join(", ")}\n💈 *Barbeiro:* ${appointmentDetails.barber}\n💰 *Total:* R$ ${appointmentDetails.total.toFixed(2)}\n\nAguardo confirmação! 😊`;
                    const whatsappUrl = `https://wa.me/${BARBERSHOP_WHATSAPP}?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, "_blank");
                    setShowSuccessDialog(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar para WhatsApp da Barbearia
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSuccessDialog(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
