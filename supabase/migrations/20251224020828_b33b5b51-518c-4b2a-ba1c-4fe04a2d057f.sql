-- Create table to link promotions with products and services
CREATE TABLE public.promotion_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_item_type CHECK (
    (product_id IS NOT NULL AND service_id IS NULL) OR 
    (product_id IS NULL AND service_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.promotion_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view promotion items for active promotions
CREATE POLICY "Anyone can view promotion items for active promotions"
ON public.promotion_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.promotions 
    WHERE promotions.id = promotion_items.promotion_id 
    AND promotions.active = true 
    AND (promotions.end_date IS NULL OR promotions.end_date > now())
  )
);

-- Barbers and admins can manage promotion items
CREATE POLICY "Barbers and admins can manage promotion items"
ON public.promotion_items
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for better performance
CREATE INDEX idx_promotion_items_promotion ON public.promotion_items(promotion_id);
CREATE INDEX idx_promotion_items_product ON public.promotion_items(product_id);
CREATE INDEX idx_promotion_items_service ON public.promotion_items(service_id);