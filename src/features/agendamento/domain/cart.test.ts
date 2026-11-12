import { describe, expect, it } from "vitest";
import { addOne, cartCount, cartToRpc, cartTotal, isOutOfStock, removeOne, setQuantity, type CartItem } from "./cart";

const pomada = { id: "p1", name: "Pomada", price: 40, stock_quantity: 2, image_url: null };
const oleo = { id: "p2", name: "Óleo", price: 39, stock_quantity: null };

describe("carrinho de produtos", () => {
  it("adiciona várias unidades do mesmo produto", () => {
    let cart: CartItem[] = [];
    cart = addOne(cart, pomada).cart;
    cart = addOne(cart, pomada).cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
    expect(cartCount(cart)).toBe(2);
    expect(cartTotal(cart)).toBe(80);
  });

  it("não passa do estoque e avisa", () => {
    let cart = setQuantity([], pomada, 2).cart;
    const change = addOne(cart, pomada);
    cart = change.cart;
    expect(change.limited).toBe(true);
    expect(cart[0].quantity).toBe(2);
  });

  it("produto sem controle de estoque não tem limite", () => {
    const { cart, limited } = setQuantity([], oleo, 10);
    expect(limited).toBe(false);
    expect(cartTotal(cart)).toBe(390);
  });

  it("tirar a última unidade remove do carrinho", () => {
    const cart = removeOne(addOne([], pomada).cart, pomada).cart;
    expect(cart).toEqual([]);
  });

  it("esgotado", () => {
    expect(isOutOfStock({ ...pomada, stock_quantity: 0 })).toBe(true);
    expect(isOutOfStock(oleo)).toBe(false);
    expect(setQuantity([], { ...pomada, stock_quantity: 0 }, 1)).toEqual({ cart: [], limited: true });
  });

  it("formato da RPC", () => {
    const cart = setQuantity(addOne([], oleo).cart, pomada, 2).cart;
    expect(cartToRpc(cart)).toEqual([
      { product_id: "p2", quantity: 1 },
      { product_id: "p1", quantity: 2 },
    ]);
  });
});
