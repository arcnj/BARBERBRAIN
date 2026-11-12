import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  max?: number | null;
  name: string;
  size?: "sm" | "md";
}

/** − 2 + com rótulos acessíveis. */
export function QuantityStepper({ quantity, onIncrement, onDecrement, max, name, size = "sm" }: QuantityStepperProps) {
  const atMax = max !== null && max !== undefined && quantity >= max;
  const h = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <div className="flex items-center justify-between gap-1 rounded-md border border-primary/40 bg-primary/10 p-0.5">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={h}
        onClick={onDecrement}
        aria-label={quantity === 1 ? `Remover ${name}` : `Diminuir quantidade de ${name}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className={cn("min-w-6 text-center font-semibold text-foreground", size === "sm" ? "text-xs" : "text-sm")} aria-live="polite">
        {quantity}
      </span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={h}
        onClick={onIncrement}
        disabled={atMax}
        aria-label={atMax ? `Sem mais unidades de ${name} em estoque` : `Aumentar quantidade de ${name}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
