import * as React from "react";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths, startOfYear, endOfYear, subQuarters, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PeriodType = "month" | "quarter" | "semester" | "year" | "custom";

interface PeriodFilterProps {
  onPeriodChange: (startDate: Date, endDate: Date, periodType: PeriodType) => void;
  className?: string;
}

interface PeriodOption {
  label: string;
  value: string;
  type: PeriodType;
  getRange: () => { start: Date; end: Date };
}

export function PeriodFilter({ onPeriodChange, className }: PeriodFilterProps) {
  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = React.useState<string>("current-month");
  const [customStart, setCustomStart] = React.useState<Date | undefined>();
  const [customEnd, setCustomEnd] = React.useState<Date | undefined>();
  const [isCustomOpen, setIsCustomOpen] = React.useState(false);

  const periodOptions: PeriodOption[] = [
    {
      label: "Este mês",
      value: "current-month",
      type: "month",
      getRange: () => ({ start: startOfMonth(now), end: endOfMonth(now) }),
    },
    {
      label: "Mês passado",
      value: "last-month",
      type: "month",
      getRange: () => ({ start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }),
    },
    {
      label: "Últimos 3 meses",
      value: "last-3-months",
      type: "quarter",
      getRange: () => ({ start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }),
    },
    {
      label: "Este trimestre",
      value: "current-quarter",
      type: "quarter",
      getRange: () => ({ start: startOfQuarter(now), end: endOfQuarter(now) }),
    },
    {
      label: "Trimestre passado",
      value: "last-quarter",
      type: "quarter",
      getRange: () => ({ start: startOfQuarter(subQuarters(now, 1)), end: endOfQuarter(subQuarters(now, 1)) }),
    },
    {
      label: "Este semestre",
      value: "current-semester",
      type: "semester",
      getRange: () => {
        const currentMonth = now.getMonth();
        if (currentMonth < 6) {
          return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 5, 30) };
        }
        return { start: new Date(now.getFullYear(), 6, 1), end: new Date(now.getFullYear(), 11, 31) };
      },
    },
    {
      label: "Semestre passado",
      value: "last-semester",
      type: "semester",
      getRange: () => {
        const currentMonth = now.getMonth();
        if (currentMonth < 6) {
          return { start: new Date(now.getFullYear() - 1, 6, 1), end: new Date(now.getFullYear() - 1, 11, 31) };
        }
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 5, 30) };
      },
    },
    {
      label: "Este ano",
      value: "current-year",
      type: "year",
      getRange: () => ({ start: startOfYear(now), end: endOfYear(now) }),
    },
    {
      label: "Ano passado",
      value: "last-year",
      type: "year",
      getRange: () => ({ start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) }),
    },
    {
      label: "Personalizado",
      value: "custom",
      type: "custom",
      getRange: () => ({ start: customStart || now, end: customEnd || now }),
    },
  ];

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    
    if (value === "custom") {
      setIsCustomOpen(true);
      return;
    }

    const option = periodOptions.find(o => o.value === value);
    if (option) {
      const { start, end } = option.getRange();
      onPeriodChange(start, end, option.type);
    }
  };

  const handleCustomDateApply = () => {
    if (customStart && customEnd) {
      onPeriodChange(customStart, customEnd, "custom");
      setIsCustomOpen(false);
    }
  };

  const selectedOption = periodOptions.find(o => o.value === selectedPeriod);
  const displayLabel = selectedPeriod === "custom" && customStart && customEnd
    ? `${format(customStart, "dd/MM/yy", { locale: ptBR })} - ${format(customEnd, "dd/MM/yy", { locale: ptBR })}`
    : selectedOption?.label || "Selecione";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[180px] h-9">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <SelectValue>{displayLabel}</SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current-month">Este mês</SelectItem>
          <SelectItem value="last-month">Mês passado</SelectItem>
          <SelectItem value="last-3-months">Últimos 3 meses</SelectItem>
          <SelectItem value="current-quarter">Este trimestre</SelectItem>
          <SelectItem value="last-quarter">Trimestre passado</SelectItem>
          <SelectItem value="current-semester">Este semestre</SelectItem>
          <SelectItem value="last-semester">Semestre passado</SelectItem>
          <SelectItem value="current-year">Este ano</SelectItem>
          <SelectItem value="last-year">Ano passado</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {selectedPeriod === "custom" && (
        <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {customStart && customEnd 
                ? `${format(customStart, "dd/MM", { locale: ptBR })} - ${format(customEnd, "dd/MM", { locale: ptBR })}`
                : "Selecionar datas"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col sm:flex-row">
              <div className="p-2">
                <p className="text-xs text-muted-foreground mb-2 text-center">Data inicial</p>
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  className="pointer-events-auto"
                  disabled={(date) => customEnd ? date > customEnd : false}
                />
              </div>
              <div className="border-l p-2">
                <p className="text-xs text-muted-foreground mb-2 text-center">Data final</p>
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                  className="pointer-events-auto"
                  disabled={(date) => customStart ? date < customStart : false}
                />
              </div>
            </div>
            <div className="p-2 border-t flex justify-end">
              <Button 
                size="sm" 
                onClick={handleCustomDateApply}
                disabled={!customStart || !customEnd}
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
