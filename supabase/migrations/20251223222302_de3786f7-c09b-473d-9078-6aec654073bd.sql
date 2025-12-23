-- Create table for products in orders
CREATE TABLE public.order_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_products ENABLE ROW LEVEL SECURITY;

-- Customers can view their order products
CREATE POLICY "Users can view their order products" 
ON public.order_products 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_products.order_id 
  AND orders.customer_id = auth.uid()
));

-- Customers can insert products to their orders
CREATE POLICY "Users can insert products to their orders" 
ON public.order_products 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_products.order_id 
  AND orders.customer_id = auth.uid()
));

-- Barbers can view all order products
CREATE POLICY "Barbers can view all order products" 
ON public.order_products 
FOR SELECT 
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));