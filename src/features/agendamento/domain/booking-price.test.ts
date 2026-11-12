import { describe, expect, it } from "vitest";
import { previewBookingPrice } from "./booking-price";

describe("previewBookingPrice (igual à create_appointment)", () => {
  it("serviços + produtos", () => {
    expect(previewBookingPrice({ servicesTotal: 85, comboPrice: null, productsTotal: 80, coupon: null })).toEqual({
      subtotal: 165,
      discount: 0,
      total: 165,
    });
  });
  it("combo usa o preço promocional", () => {
    expect(previewBookingPrice({ servicesTotal: 85, comboPrice: 75, productsTotal: 0, coupon: null }).total).toBe(75);
  });
  it("cupom percentual sobre o subtotal", () => {
    const p = previewBookingPrice({
      servicesTotal: 50,
      comboPrice: null,
      productsTotal: 0,
      coupon: { discount_percentage: 10, discount_value: null },
    });
    expect(p).toEqual({ subtotal: 50, discount: 5, total: 45 });
  });
  it("cupom em reais não passa do subtotal", () => {
    const p = previewBookingPrice({
      servicesTotal: 15,
      comboPrice: null,
      productsTotal: 0,
      coupon: { discount_percentage: null, discount_value: 30 },
    });
    expect(p.total).toBe(0);
  });
});
