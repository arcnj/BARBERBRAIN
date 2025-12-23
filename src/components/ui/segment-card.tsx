import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface SegmentCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  count: number;
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
  className?: string;
}

export function SegmentCard({
  icon: Icon,
  iconColor = "text-primary",
  title,
  count,
  subtitle,
  actionLabel,
  onAction,
  className,
}: SegmentCardProps) {
  return (
    <div className={cn(
      "glass rounded-xl p-5 transition-all duration-300 hover:border-primary/30",
      "animate-slide-up",
      className
    )}>
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg bg-muted p-2.5", iconColor.replace("text-", "bg-").replace("-foreground", "") + "/10")}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
          </div>
          <p className="text-2xl font-display font-bold text-foreground mt-1">
            {count} <span className="text-sm font-normal text-muted-foreground">clientes</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>
      
      <Button 
        variant="secondary" 
        size="sm" 
        className="mt-4 w-full"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
