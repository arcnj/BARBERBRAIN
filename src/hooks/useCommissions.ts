import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrderData {
  orderId: string;
  barberId: string;
  scheduledAt: string;
  serviceTotal: number;
  productTotal: number;
}

export function useCommissions() {
  const queryClient = useQueryClient();

  // Calculate and register commissions when an order is completed
  const registerCommissions = useMutation({
    mutationFn: async (orderData: OrderData) => {
      const { orderId, barberId, scheduledAt, serviceTotal, productTotal } = orderData;
      
      // Get the commission settings for this barber
      const { data: commissionSettings, error: settingsError } = await supabase
        .from('barber_commission_settings')
        .select('*')
        .eq('barber_id', barberId)
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching commission settings:', settingsError);
        throw settingsError;
      }

      // Use default values if no settings exist
      const serviceCommissionPercent = commissionSettings?.service_commission_percent ?? 50;
      const productCommissionPercent = commissionSettings?.product_commission_percent ?? 10;

      // Calculate commissions
      const serviceCommission = (serviceTotal * serviceCommissionPercent) / 100;
      const productCommission = (productTotal * productCommissionPercent) / 100;

      // Get month and year from scheduled_at
      const orderDate = new Date(scheduledAt);
      const month = orderDate.getMonth() + 1;
      const year = orderDate.getFullYear();

      // Check if records already exist for this order
      const { data: existingRecords } = await supabase
        .from('barber_financial_records')
        .select('id, record_type')
        .eq('reference_id', orderId);

      const existingServiceRecord = existingRecords?.find(r => r.record_type === 'service_commission');
      const existingProductRecord = existingRecords?.find(r => r.record_type === 'product_commission');

      // Insert service commission if there's any and it doesn't exist yet
      if (serviceCommission > 0 && !existingServiceRecord) {
        const { error: serviceError } = await supabase
          .from('barber_financial_records')
          .insert({
            barber_id: barberId,
            record_type: 'service_commission',
            amount: serviceCommission,
            reference_id: orderId,
            description: `Comissão de serviços (${serviceCommissionPercent}%)`,
            month,
            year
          });

        if (serviceError) {
          console.error('Error inserting service commission:', serviceError);
        }
      }

      // Insert product commission if there's any and it doesn't exist yet
      if (productCommission > 0 && !existingProductRecord) {
        const { error: productError } = await supabase
          .from('barber_financial_records')
          .insert({
            barber_id: barberId,
            record_type: 'product_commission',
            amount: productCommission,
            reference_id: orderId,
            description: `Comissão de produtos (${productCommissionPercent}%)`,
            month,
            year
          });

        if (productError) {
          console.error('Error inserting product commission:', productError);
        }
      }

      return {
        serviceCommission,
        productCommission,
        total: serviceCommission + productCommission
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barber-financial-records'] });
    }
  });

  // Calculate commissions for an order (without saving)
  const calculateCommissions = async (barberId: string, serviceTotal: number, productTotal: number) => {
    const { data: commissionSettings } = await supabase
      .from('barber_commission_settings')
      .select('*')
      .eq('barber_id', barberId)
      .maybeSingle();

    const serviceCommissionPercent = commissionSettings?.service_commission_percent ?? 50;
    const productCommissionPercent = commissionSettings?.product_commission_percent ?? 10;

    const serviceCommission = (serviceTotal * serviceCommissionPercent) / 100;
    const productCommission = (productTotal * productCommissionPercent) / 100;

    return {
      serviceCommission,
      productCommission,
      servicePercent: serviceCommissionPercent,
      productPercent: productCommissionPercent,
      total: serviceCommission + productCommission
    };
  };

  return {
    registerCommissions,
    calculateCommissions
  };
}
