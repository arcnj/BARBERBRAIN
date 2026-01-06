-- Add stock quantity column to products table
ALTER TABLE public.products 
ADD COLUMN stock_quantity integer DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN public.products.stock_quantity IS 'Stock quantity. NULL means unlimited/not tracked. 0 means out of stock.';