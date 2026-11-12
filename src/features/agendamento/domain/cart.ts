/** Carrinho de produtos que o cliente leva no dia do atendimento. Funções puras. */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  /** Estoque informado pela barbearia; null = sem controle de estoque. */
  stock: number | null;
  imageUrl: string | null;
}

export interface CartProduct {
  id: string;
  name: string;
  price: number;
  stock_quantity?: number | null;
  image_url?: string | null;
}

export interface CartChange {
  cart: CartItem[];
  /** true quando o pedido passou do estoque e a quantidade foi limitada. */
  limited: boolean;
}

const maxFor = (stock: number | null) => (stock === null ? Number.POSITIVE_INFINITY : Math.max(stock, 0));

export function isOutOfStock(product: CartProduct): boolean {
  return product.stock_quantity !== null && product.stock_quantity !== undefined && product.stock_quantity <= 0;
}

export function quantityOf(cart: CartItem[], productId: string): number {
  return cart.find((i) => i.productId === productId)?.quantity ?? 0;
}

/** Define a quantidade (0 tira do carrinho), sem passar do estoque. */
export function setQuantity(cart: CartItem[], product: CartProduct, quantity: number): CartChange {
  const stock = product.stock_quantity ?? null;
  const wanted = Math.max(0, Math.floor(quantity));
  const allowed = Math.min(wanted, maxFor(stock));
  const limited = allowed < wanted;
  const rest = cart.filter((i) => i.productId !== product.id);
  if (allowed === 0) return { cart: rest, limited };

  const item: CartItem = {
    productId: product.id,
    name: product.name,
    price: Number(product.price),
    quantity: allowed,
    stock,
    imageUrl: product.image_url ?? null,
  };
  const index = cart.findIndex((i) => i.productId === product.id);
  if (index === -1) return { cart: [...cart, item], limited };
  const next = [...cart];
  next[index] = item;
  return { cart: next, limited };
}

export function addOne(cart: CartItem[], product: CartProduct): CartChange {
  return setQuantity(cart, product, quantityOf(cart, product.id) + 1);
}

export function removeOne(cart: CartItem[], product: CartProduct): CartChange {
  return setQuantity(cart, product, quantityOf(cart, product.id) - 1);
}

export function cartCount(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/** Formato que a RPC create_appointment espera. */
export function cartToRpc(cart: CartItem[]): { product_id: string; quantity: number }[] {
  return cart.map((i) => ({ product_id: i.productId, quantity: i.quantity }));
}
