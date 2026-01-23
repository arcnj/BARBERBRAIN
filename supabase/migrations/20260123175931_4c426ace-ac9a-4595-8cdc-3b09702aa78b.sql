-- 1. BARBERS TABLE: Remove public access to sensitive data
-- Drop the permissive policy that exposes email and phone
DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbers;

-- Create a view that only exposes non-sensitive barber data for public access
CREATE OR REPLACE VIEW public.barbers_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  avatar_url,
  active
FROM public.barbers
WHERE active = true;

-- Allow anyone to select from the public view
GRANT SELECT ON public.barbers_public TO anon, authenticated;

-- Create policy for authenticated users to view basic barber info
CREATE POLICY "Authenticated users can view active barbers basic info"
ON public.barbers
FOR SELECT
TO authenticated
USING (active = true);

-- 2. STOCK_MOVEMENTS TABLE: Remove public access
-- Drop the policy that allows anyone to view stock movements
DROP POLICY IF EXISTS "Anyone can view stock movements" ON public.stock_movements;

-- Now only barbers and admins can view stock movements via the existing "Barbers and admins can manage stock movements" policy

-- 3. PRODUCTS TABLE: Create a public view that excludes cost_price
-- Create a view that only exposes non-sensitive product data
CREATE OR REPLACE VIEW public.products_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  description,
  price,
  image_url,
  category,
  stock_quantity,
  active,
  created_at,
  updated_at
FROM public.products
WHERE active = true;

-- Allow anyone to select from the public view
GRANT SELECT ON public.products_public TO anon, authenticated;

-- Drop the existing policy that exposes all product data
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Create policy for authenticated users (barbers/admins already have full access via the "ALL" policy)
CREATE POLICY "Authenticated users can view active products"
ON public.products
FOR SELECT
TO authenticated
USING (active = true);