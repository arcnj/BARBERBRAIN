-- Allow admins and barbers to create orders for customers
CREATE POLICY "Admins and barbers can create orders"
ON public.orders
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));