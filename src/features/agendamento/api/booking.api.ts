import { supabase } from "@/integrations/supabase/client";

export interface AvailableSlot {
  slot_time: string;
  available: boolean;
}

/** Horários do barbeiro no dia, calculados pelo banco (expediente + agenda de todos). */
export async function fetchAvailableSlots(params: {
  barbershopId: string;
  barberId: string;
  date: string; // AAAA-MM-DD
  serviceIds: string[];
}): Promise<AvailableSlot[]> {
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_barbershop_id: params.barbershopId,
    p_barber_id: params.barberId,
    p_date: params.date,
    p_service_ids: params.serviceIds,
  });
  if (error) throw error;
  return data ?? [];
}

export interface CreateAppointmentInput {
  barbershopId: string;
  barberId: string;
  scheduledAt: string; // ISO com fuso
  serviceIds: string[];
  products: { product_id: string; quantity: number }[];
  comboId?: string | null;
  useBirthdayCoupon?: boolean;
  notes?: string | null;
  customerId?: string | null;
}

/** Cria o agendamento; preço, combo, cupom, estoque e horário são conferidos no banco. */
export async function createAppointment(input: CreateAppointmentInput): Promise<string> {
  const { data, error } = await supabase.rpc("create_appointment", {
    p_barbershop_id: input.barbershopId,
    p_barber_id: input.barberId,
    p_scheduled_at: input.scheduledAt,
    p_service_ids: input.serviceIds,
    p_products: input.products,
    p_combo_id: input.comboId ?? undefined,
    p_use_birthday_coupon: input.useBirthdayCoupon ?? false,
    p_notes: input.notes ?? undefined,
    p_customer_id: input.customerId ?? undefined,
  });
  if (error) throw error;
  return data;
}

/** Total gravado pelo banco para o pedido recém-criado. */
export async function fetchOrderTotal(orderId: string): Promise<number> {
  const { data, error } = await supabase.from("orders").select("total_price").eq("id", orderId).single();
  if (error) throw error;
  return Number(data.total_price ?? 0);
}
