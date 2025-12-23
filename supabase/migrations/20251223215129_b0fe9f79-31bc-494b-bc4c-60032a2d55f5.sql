-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (active = true);

-- Barbers and admins can manage products
CREATE POLICY "Barbers and admins can manage products"
ON public.products
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Barbers can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'products' AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Barbers can update product images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'products' AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Barbers can delete product images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products' AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));