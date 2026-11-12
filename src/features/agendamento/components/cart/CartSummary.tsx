import { Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/shared/lib/money";
import { cartItemAsProduct, type ProductCart } from "../../hooks/useProductCart";
import { QuantityStepper } from "./QuantityStepper";

/** Lista dos produtos no resumo do agendamento, com quantidade editável. */
export function CartSummary({ cart }: { cart: ProductCart }) {
  if (cart.count === 0) return null;
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Package className="h-4 w-4 text-primary" />
        Produtos para levar no atendimento
      </p>
      <ul className="space-y-2">
        {cart.items.map((item) => {
          const product = cartItemAsProduct(item);
          return (
            <li key={item.productId} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBRL(item.price)} cada · <span className="font-medium text-foreground">{formatBRL(item.price * item.quantity)}</span>
                </p>
              </div>
              <div className="w-24">
                <QuantityStepper
                  name={item.name}
                  quantity={item.quantity}
                  max={item.stock}
                  onIncrement={() => cart.add(product)}
                  onDecrement={() => cart.decrement(product)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => cart.remove(product)}
                aria-label={`Tirar ${item.name} do pedido`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
