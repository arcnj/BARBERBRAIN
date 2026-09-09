import { cn } from "@/lib/utils";

interface UsageBarProps {
  used: number;
  limit: number | null;
  className?: string;
  showLabel?: boolean;
}

export function UsageBar({ used, limit, className, showLabel = true }: UsageBarProps) {
  if (limit == null) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="h-2 rounded-full bg-primary/20 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-primary/60 to-primary" />
        </div>
        {showLabel && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{used} utilizações</span> neste ciclo ·
            Plano ilimitado
          </p>
        )}
      </div>
    );
  }

  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const remaining = Math.max(0, limit - used);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            remaining === 0 ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {used} de {limit} utilizados
          </span>{" "}
          · {remaining} disponível{remaining === 1 ? "" : "eis"}
        </p>
      )}
    </div>
  );
}
