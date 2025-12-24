-- Allow admins and barbers to insert order items
CREATE POLICY "Admins and barbers can insert order items"
ON public.order_items
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));