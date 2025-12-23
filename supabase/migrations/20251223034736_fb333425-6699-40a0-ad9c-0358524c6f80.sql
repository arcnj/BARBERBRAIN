-- Drop the existing customer update policy
DROP POLICY IF EXISTS "Customers can update their pending orders" ON public.orders;

-- Create a new policy that allows customers to update their own orders (cancel or edit pending ones)
CREATE POLICY "Customers can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = customer_id AND status IN ('pending', 'confirmed'))
WITH CHECK (auth.uid() = customer_id);