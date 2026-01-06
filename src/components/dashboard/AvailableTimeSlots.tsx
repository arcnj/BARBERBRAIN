import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2 } from "lucide-react";
import { format, startOfDay, endOfDay, isToday, isBefore, setHours, setMinutes, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";

interface AvailableTimeSlotsProps {
  selectedDate: Date;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  barberId?: string | null;
  serviceDuration: number;
}

// Generate time slots from 7:00 to 21:00 in 30 minute intervals
const generateAllTimeSlots = () => {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let hour = 7; hour <= 21; hour++) {
    slots.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
    if (hour < 21) {
      slots.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
    }
  }
  return slots;
};

const ALL_TIME_SLOTS = generateAllTimeSlots();

export function AvailableTimeSlots({
  selectedDate,
  selectedTime,
  onSelectTime,
  barberId,
  serviceDuration,
}: AvailableTimeSlotsProps) {
  // Fetch existing orders for the selected date
  const { data: existingOrders, isLoading } = useQuery({
    queryKey: ["available-slots-orders", format(selectedDate, "yyyy-MM-dd"), barberId],
    queryFn: async () => {
      const startDate = startOfDay(selectedDate).toISOString();
      const endDate = endOfDay(selectedDate).toISOString();

      let query = supabase
        .from("orders")
        .select(`
          id,
          scheduled_at,
          status,
          order_items (
            services (
              duration_minutes
            )
          )
        `)
        .gte("scheduled_at", startDate)
        .lte("scheduled_at", endDate)
        .not("status", "in", '("cancelled","completed")');

      if (barberId) {
        query = query.or(`barber_id.eq.${barberId},preferred_barber_id.eq.${barberId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  // Calculate available slots
  const availableSlots = useMemo(() => {
    const now = new Date();
    
    return ALL_TIME_SLOTS.map(slot => {
      const slotTime = setMinutes(setHours(selectedDate, slot.hour), slot.minute);
      const slotEnd = addMinutes(slotTime, serviceDuration);
      
      // Check if slot is in the past
      if (isToday(selectedDate) && isBefore(slotTime, now)) {
        return { ...slot, available: false, reason: "passado" };
      }
      
      // Check if slot conflicts with existing orders
      const hasConflict = existingOrders?.some(order => {
        const orderStart = new Date(order.scheduled_at);
        const orderDuration = order.order_items?.[0]?.services?.duration_minutes || 30;
        const orderEnd = addMinutes(orderStart, orderDuration);
        
        // Check for overlap
        return (
          (slotTime >= orderStart && slotTime < orderEnd) ||
          (slotEnd > orderStart && slotEnd <= orderEnd) ||
          (slotTime <= orderStart && slotEnd >= orderEnd)
        );
      });
      
      if (hasConflict) {
        return { ...slot, available: false, reason: "ocupado" };
      }
      
      return { ...slot, available: true, reason: null };
    });
  }, [selectedDate, existingOrders, serviceDuration]);

  const availableCount = availableSlots.filter(s => s.available).length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Horário</Label>
        <div className="flex items-center justify-center h-32 border rounded-lg bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horário
        </Label>
        <Badge variant="secondary" className="text-xs">
          {availableCount} disponíveis
        </Badge>
      </div>
      
      <ScrollArea className="h-40 border rounded-lg p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {availableSlots.map((slot) => (
            <Button
              key={slot.label}
              type="button"
              variant={selectedTime === slot.label ? "default" : "outline"}
              size="sm"
              disabled={!slot.available}
              onClick={() => onSelectTime(slot.label)}
              className={cn(
                "text-xs h-8",
                !slot.available && "opacity-40 line-through",
                selectedTime === slot.label && "ring-2 ring-primary ring-offset-1"
              )}
            >
              {slot.label}
            </Button>
          ))}
        </div>
      </ScrollArea>
      
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border bg-background" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border bg-muted opacity-40" />
          <span>Ocupado</span>
        </div>
      </div>
    </div>
  );
}
