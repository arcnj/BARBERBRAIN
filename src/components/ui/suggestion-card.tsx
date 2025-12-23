import { cn } from "@/lib/utils";
import { LucideIcon, Lightbulb, X } from "lucide-react";
import { Button } from "./button";

interface SuggestionCardProps {
  icon?: LucideIcon;
  badge?: string;
  title: string;
  description: string;
  suggestion: string;
  stats?: string;
  primaryAction: string;
  secondaryAction?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function SuggestionCard({
  icon: Icon = Lightbulb,
  badge,
  title,
  description,
  suggestion,
  stats,
  primaryAction,
  secondaryAction,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
  className,
}: SuggestionCardProps) {
  return (
    <div className={cn(
      "glass rounded-xl p-5 border-primary/20 relative overflow-hidden",
      "animate-slide-up",
      className
    )}>
      {/* Subtle glow effect */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            
            <div>
              {badge && (
                <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full mb-2">
                  {badge}
                </span>
              )}
              <h3 className="font-display font-semibold text-foreground">{title}</h3>
            </div>
          </div>
          
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">{description}</p>
        
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">{suggestion}</p>
          </div>
        </div>
        
        {stats && (
          <p className="text-xs text-muted-foreground mt-3">{stats}</p>
        )}
        
        <div className="flex items-center gap-2 mt-4">
          <Button size="sm" onClick={onPrimaryAction}>
            {primaryAction}
          </Button>
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={onSecondaryAction}>
              {secondaryAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
