import { Badge } from "@/components/ui/badge";
import { BadgeCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriberInfo } from "@/hooks/useSubscriptionStatus";

interface SubscriberBadgeProps {
  subscription: SubscriberInfo | null;
  compact?: boolean;
  className?: string;
}

export function SubscriberBadge({ subscription, compact, className }: SubscriberBadgeProps) {
  if (!subscription) return null;

  const alert = subscription.expired || subscription.expiringSoon;
  const label = subscription.expired
    ? "Assinatura vencida"
    : subscription.expiringSoon
      ? `Vence em ${subscription.daysLeft} dia(s)`
      : compact
        ? "Assinante"
        : `Assinante · ${subscription.planName}`;

  return (
    <Badge
      className={cn(
        "border gap-1 whitespace-nowrap",
        alert
          ? "bg-warning/20 text-warning border-warning/50"
          : "bg-primary/20 text-primary border-primary/50",
        compact && "text-[10px] px-1.5 py-0",
        className
      )}
      title={`Plano ${subscription.planName}`}
    >
      {alert ? (
        <AlertTriangle className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      ) : (
        <BadgeCheck className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      )}
      {label}
    </Badge>
  );
}
