import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface AlertCardProps {
  icon: LucideIcon;
  variant?: "warning" | "info" | "success" | "danger";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const variantStyles = {
  warning: {
    bg: "bg-warning/10 border-warning/30",
    icon: "text-warning",
  },
  info: {
    bg: "bg-primary/10 border-primary/30",
    icon: "text-primary",
  },
  success: {
    bg: "bg-success/10 border-success/30",
    icon: "text-success",
  },
  danger: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: "text-destructive",
  },
};

export function AlertCard({
  icon: Icon,
  variant = "info",
  title,
  description,
  actionLabel,
  onAction,
  className,
}: AlertCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "rounded-xl border p-4 transition-all duration-300",
      styles.bg,
      "animate-scale-in",
      className
    )}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", styles.icon)} />
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          
          {actionLabel && (
            <Button 
              variant="link" 
              size="sm" 
              className="px-0 h-auto mt-2 text-primary"
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
