/**
 * Prévia do valor do agendamento (a mesma conta da RPC create_appointment).
 * Só para mostrar na tela: quem decide o preço é o banco.
 */
export interface BookingPriceInput {
  servicesTotal: number;
  comboPrice: number | null;
  productsTotal: number;
  coupon: { discount_percentage: number | null; discount_value: number | null } | null;
}

export interface BookingPrice {
  subtotal: number;
  discount: number;
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function previewBookingPrice({ servicesTotal, comboPrice, productsTotal, coupon }: BookingPriceInput): BookingPrice {
  const subtotal = round2((comboPrice ?? servicesTotal) + productsTotal);
  let discount = 0;
  if (coupon?.discount_percentage) discount = round2((subtotal * coupon.discount_percentage) / 100);
  else if (coupon?.discount_value) discount = Math.min(coupon.discount_value, subtotal);
  return { subtotal, discount, total: round2(subtotal - discount) };
}
