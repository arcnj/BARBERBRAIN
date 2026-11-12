import { useCallback, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  addOne,
  cartCount,
  cartTotal,
  quantityOf,
  removeOne,
  setQuantity,
  type CartChange,
  type CartItem,
  type CartProduct,
} from "../domain/cart";

// Um carrinho por barbearia, guardado na aba do navegador (some ao fechar a aba).
const listeners = new Set<() => void>();
const memory = new Map<string, CartItem[]>();
const EMPTY: CartItem[] = [];
const storageKey = (shopId: string) => `barberbrain:carrinho:${shopId}`;

function read(shopId: string): CartItem[] {
  if (!memory.has(shopId)) {
    let stored: CartItem[] = EMPTY;
    try {
      const raw = sessionStorage.getItem(storageKey(shopId));
      if (raw) stored = JSON.parse(raw) as CartItem[];
    } catch {
      /* sem armazenamento: carrinho só em memória */
    }
    memory.set(shopId, stored);
  }
  return memory.get(shopId) ?? EMPTY;
}

function write(shopId: string, cart: CartItem[]) {
  memory.set(shopId, cart);
  try {
    sessionStorage.setItem(storageKey(shopId), JSON.stringify(cart));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Carrinho de produtos da barbearia atual (compartilhado entre a área do cliente e a vitrine). */
export function useProductCart(shopId: string | undefined) {
  const items = useSyncExternalStore(subscribe, () => (shopId ? read(shopId) : EMPTY));

  const apply = useCallback(
    (change: CartChange, product: CartProduct) => {
      if (!shopId) return;
      write(shopId, change.cart);
      if (change.limited) {
        const stock = product.stock_quantity ?? 0;
        toast.warning(
          stock > 0 ? `Só temos ${stock} unidade(s) de ${product.name} em estoque.` : `${product.name} está esgotado.`,
        );
      }
    },
    [shopId],
  );

  const add = useCallback((p: CartProduct) => apply(addOne(read(shopId ?? ""), p), p), [apply, shopId]);
  const decrement = useCallback((p: CartProduct) => apply(removeOne(read(shopId ?? ""), p), p), [apply, shopId]);
  const remove = useCallback((p: CartProduct) => apply(setQuantity(read(shopId ?? ""), p, 0), p), [apply, shopId]);
  const clear = useCallback(() => shopId && write(shopId, []), [shopId]);

  return useMemo(
    () => ({
      items,
      count: cartCount(items),
      total: cartTotal(items),
      quantityOf: (productId: string) => quantityOf(items, productId),
      add,
      decrement,
      remove,
      clear,
    }),
    [items, add, decrement, remove, clear],
  );
}

export type ProductCart = ReturnType<typeof useProductCart>;

/** Produto do carrinho de volta no formato usado pelas ações (para os botões + e −). */
export const cartItemAsProduct = (i: CartItem): CartProduct => ({
  id: i.productId,
  name: i.name,
  price: i.price,
  stock_quantity: i.stock,
  image_url: i.imageUrl,
});
