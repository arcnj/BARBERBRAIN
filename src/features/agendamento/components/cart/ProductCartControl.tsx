import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOutOfStock, type CartProduct } from "../../domain/cart";
import type { ProductCart } from "../../hooks/useProductCart";
import { QuantityStepper } from "./QuantityStepper";

/** Botão "Adicionar" que vira − quantidade + quando o produto está no carrinho. */
export function ProductCartControl({ product, cart }: { product: CartProduct; cart: ProductCart }) {
  const quantity = cart.quantityOf(product.id);
  if (isOutOfStock(product)) {
    return (
      <Button size="sm" variant="secondary" className="h-7 w-full text-xs" disabled>
        Esgotado
      </Button>
    );
  }
  if (quantity === 0) {
    return (
      <Button size="sm" className="h-7 w-full gap-1 text-xs" onClick={() => cart.add(product)}>
        <ShoppingBag className="h-3.5 w-3.5" />
        Adicionar
      </Button>
    );
  }
  return (
    <QuantityStepper
      name={product.name}
      quantity={quantity}
      max={product.stock_quantity ?? null}
      onIncrement={() => cart.add(product)}
      onDecrement={() => cart.decrement(product)}
    />
  );
}
