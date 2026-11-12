import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductCartControl } from "./ProductCartControl";
import { CartBar } from "./CartBar";
import { useProductCart } from "../../hooks/useProductCart";
import type { CartProduct } from "../../domain/cart";

const pomada: CartProduct = { id: "p1", name: "Pomada", price: 40, stock_quantity: 2, image_url: null };

function Vitrine({ product }: { product: CartProduct }) {
  const cart = useProductCart("loja-teste");
  return (
    <>
      <ProductCartControl product={product} cart={cart} />
      <CartBar cart={cart} actionLabel="Ver resumo" onAction={() => undefined} />
    </>
  );
}

describe("carrinho na vitrine", () => {
  beforeEach(() => sessionStorage.clear());

  it("Adicionar vira − quantidade + e a barra mostra o total", () => {
    render(<Vitrine product={pomada} />);
    fireEvent.click(screen.getByRole("button", { name: /adicionar/i }));
    fireEvent.click(screen.getByRole("button", { name: /aumentar quantidade de pomada/i }));
    expect(screen.getByText("2× Pomada")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?80,00/)).toBeInTheDocument();
    // estoque = 2: o + fica bloqueado
    expect(screen.getByRole("button", { name: /sem mais unidades de pomada/i })).toBeDisabled();
  });

  it("produto esgotado não pode ser adicionado", () => {
    render(<Vitrine product={{ ...pomada, id: "p2", stock_quantity: 0 }} />);
    expect(screen.getByRole("button", { name: /esgotado/i })).toBeDisabled();
  });
});
