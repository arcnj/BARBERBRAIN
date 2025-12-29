-- Add category column to products table
ALTER TABLE public.products ADD COLUMN category text DEFAULT 'Geral';

-- Create index for better performance when filtering by category
CREATE INDEX idx_products_category ON public.products(category);