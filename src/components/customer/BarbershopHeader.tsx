import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Store } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  const todaySchedule = getTodaySchedule();
  const openNow = isCurrentlyOpen();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 rounded-lg">
        <AvatarImage src={settings.logo_url || undefined} alt={settings.name || "Barbearia"} />
        <AvatarFallback className="rounded-lg bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </AvatarFallback>
      </Avatar>
      
      <div className="hidden sm:block">
        <p className="font-heading text-sm font-semibold text-foreground leading-tight">
          {settings.name || "Barbearia"}
        </p>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`flex items-center gap-1 ${openNow ? "text-green-500" : "text-muted-foreground"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${openNow ? "bg-green-500" : "bg-muted-foreground"}`} />
            {openNow ? "Aberto" : "Fechado"}
          </span>
          {todaySchedule && !todaySchedule.closed && (
            <span className="text-muted-foreground">
              · {formatTime(todaySchedule.open)} - {formatTime(todaySchedule.close)}
            </span>
          )}
        </div>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <button className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-foreground">Horários de funcionamento</h4>
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
                    className={`flex justify-between py-1 px-1.5 rounded text-xs ${
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
