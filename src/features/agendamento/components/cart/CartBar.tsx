import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/shared/lib/money";
import type { ProductCart } from "../../hooks/useProductCart";

interface CartBarProps {
  cart: ProductCart;
  actionLabel: string;
  onAction: () => void;
}

/** Barra fixa no rodapé: quantos produtos, total e o próximo passo. */
export function CartBar({ cart, actionLabel, onAction }: CartBarProps) {
  if (cart.count === 0) return null;
  const names = cart.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <div className="relative shrink-0 rounded-full bg-primary/15 p-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {cart.count}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{names}</p>
          <p className="text-xs text-muted-foreground">
            {formatBRL(cart.total)} · você leva no dia do atendimento
          </p>
        </div>
        <Button size="sm" onClick={onAction} className="shrink-0">
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
