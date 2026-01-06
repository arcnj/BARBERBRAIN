
-- Add inventory management columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock_quantity integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS expiration_date date;

-- Create stock movements table for entry/exit history
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'sale')),
  quantity integer NOT NULL,
  unit_cost numeric,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_movements
CREATE POLICY "Barbers and admins can manage stock movements"
ON public.stock_movements
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view stock movements"
ON public.stock_movements
FOR SELECT
USING (true);

-- Create index for faster queries
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
