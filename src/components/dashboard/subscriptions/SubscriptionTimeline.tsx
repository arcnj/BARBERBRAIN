import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Banknote, RotateCcw, Scissors, Undo2, CalendarPlus } from "lucide-react";
import { HistoryEvent, useReverseUsage } from "@/hooks/useSubscriptionCycles";
import { cn } from "@/lib/utils";

const icons = {
  payment: Banknote,
  usage: Scissors,
  reversal: Undo2,
  cycle: CalendarPlus,
} as const;

const tones = {
  payment: "text-success bg-success/15",
  usage: "text-primary bg-primary/15",
  reversal: "text-warning bg-warning/15",
  cycle: "text-muted-foreground bg-muted",
} as const;

export function SubscriptionTimeline({ events }: { events: HistoryEvent[] }) {
  const reverseUsage = useReverseUsage();

  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum histórico registrado ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const Icon = icons[event.kind];
        return (
          <li
            key={event.id}
            className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3"
          >
            <span className={cn("rounded-md p-2 shrink-0", tones[event.kind])}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              {event.detail && (
                <p className="text-xs text-muted-foreground break-words">{event.detail}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parseISO(event.at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            {event.reversible && event.usageId && (
              <Button
                size="sm"
                variant="ghost"
                className="text-warning hover:text-warning shrink-0"
                disabled={reverseUsage.isPending}
                onClick={() => {
                  const reason = window.prompt("Motivo do estorno (opcional):") ?? undefined;
                  reverseUsage.mutate({ usageId: event.usageId!, reason });
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Estornar
              </Button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
