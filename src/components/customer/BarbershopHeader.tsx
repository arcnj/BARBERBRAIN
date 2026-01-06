import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MapPin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Store } from "lucide-react";

interface BarbershopSettings {
  name: string | null;
  logo_url: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  monday_open: string | null;
  monday_close: string | null;
  monday_closed: boolean | null;
  tuesday_open: string | null;
  tuesday_close: string | null;
  tuesday_closed: boolean | null;
  wednesday_open: string | null;
  wednesday_close: string | null;
  wednesday_closed: boolean | null;
  thursday_open: string | null;
  thursday_close: string | null;
  thursday_closed: boolean | null;
  friday_open: string | null;
  friday_close: string | null;
  friday_closed: boolean | null;
  saturday_open: string | null;
  saturday_close: string | null;
  saturday_closed: boolean | null;
  sunday_open: string | null;
  sunday_close: string | null;
  sunday_closed: boolean | null;
}

const DAYS_MAP: Record<string, { label: string; index: number }> = {
  sunday: { label: "Domingo", index: 0 },
  monday: { label: "Segunda", index: 1 },
  tuesday: { label: "Terça", index: 2 },
  wednesday: { label: "Quarta", index: 3 },
  thursday: { label: "Quinta", index: 4 },
  friday: { label: "Sexta", index: 5 },
  saturday: { label: "Sábado", index: 6 },
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function BarbershopHeader() {
  const [settings, setSettings] = useState<BarbershopSettings | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("barbershop_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setSettings(data);
    } catch (err) {
      console.error("Error fetching barbershop settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time.substring(0, 5);
  };

  const getTodaySchedule = () => {
    if (!settings) return null;
    const today = new Date().getDay();
    const dayKey = DAY_KEYS[today];
    
    const isClosed = settings[`${dayKey}_closed` as keyof BarbershopSettings] as boolean | null;
    const openTime = settings[`${dayKey}_open` as keyof BarbershopSettings] as string | null;
    const closeTime = settings[`${dayKey}_close` as keyof BarbershopSettings] as string | null;

    if (isClosed) return { closed: true };
    return { closed: false, open: openTime, close: closeTime };
  };

  const isCurrentlyOpen = () => {
    const schedule = getTodaySchedule();
    if (!schedule || schedule.closed) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    
    return schedule.open && schedule.close && 
           currentTime >= schedule.open.substring(0, 5) && 
           currentTime < schedule.close.substring(0, 5);
  };

  if (loading || !settings) return null;

  const todaySchedule = getTodaySchedule();
  const openNow = isCurrentlyOpen();

  return (
    <div className="mb-6 p-4 rounded-xl bg-card border border-border/50">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 rounded-xl">
          <AvatarImage src={settings.logo_url || undefined} alt={settings.name || "Barbearia"} />
          <AvatarFallback className="rounded-xl bg-primary/10">
            <Store className="h-8 w-8 text-primary" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-bold text-foreground truncate">
            {settings.name || "Barbearia"}
          </h2>
          
          {settings.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {settings.address}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant={openNow ? "default" : "secondary"}
              className={openNow ? "bg-green-500/90 hover:bg-green-500" : ""}
            >
              {openNow ? "Aberto agora" : "Fechado"}
            </Badge>
            
            {todaySchedule && !todaySchedule.closed && (
              <span className="text-xs text-muted-foreground">
                {formatTime(todaySchedule.open)} - {formatTime(todaySchedule.close)}
              </span>
            )}
          </div>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors">
          <Clock className="h-4 w-4" />
          <span>Ver horários de funcionamento</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-1 gap-1 text-sm">
            {DAY_KEYS.map((dayKey) => {
              const isClosed = settings[`${dayKey}_closed` as keyof BarbershopSettings] as boolean | null;
              const openTime = settings[`${dayKey}_open` as keyof BarbershopSettings] as string | null;
              const closeTime = settings[`${dayKey}_close` as keyof BarbershopSettings] as string | null;
              const today = new Date().getDay();
              const isToday = DAYS_MAP[dayKey].index === today;

              return (
                <div 
                  key={dayKey}
                  className={`flex justify-between py-1.5 px-2 rounded ${
                    isToday ? "bg-primary/10 font-medium" : ""
                  }`}
                >
                  <span className="text-foreground">
                    {DAYS_MAP[dayKey].label}
                    {isToday && <span className="text-primary ml-1">(Hoje)</span>}
                  </span>
                  <span className={isClosed ? "text-destructive" : "text-muted-foreground"}>
                    {isClosed ? "Fechado" : `${formatTime(openTime)} - ${formatTime(closeTime)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
