-- Create a public view for barbershop_settings that excludes the WhatsApp phone
CREATE OR REPLACE VIEW public.barbershop_settings_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    address,
    logo_url,
    monday_open,
    monday_close,
    monday_closed,
    tuesday_open,
    tuesday_close,
    tuesday_closed,
    wednesday_open,
    wednesday_close,
    wednesday_closed,
    thursday_open,
    thursday_close,
    thursday_closed,
    friday_open,
    friday_close,
    friday_closed,
    saturday_open,
    saturday_close,
    saturday_closed,
    sunday_open,
    sunday_close,
    sunday_closed,
    created_at,
    updated_at
  FROM public.barbershop_settings;
-- Note: whatsapp_phone is intentionally excluded for public access

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Anyone can view barbershop settings" ON public.barbershop_settings;

-- Create new policy: only authenticated users can view full barbershop settings (including phone)
CREATE POLICY "Authenticated users can view barbershop settings"
  ON public.barbershop_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add policy to restrict stock_movements visibility to the user who created them (for barbers)
-- First, drop and recreate the existing policy to be more restrictive
DROP POLICY IF EXISTS "Barbers and admins can manage stock movements" ON public.stock_movements;

-- Admins can see all stock movements
CREATE POLICY "Admins can manage all stock movements"
  ON public.stock_movements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Barbers can only see their own stock movements
CREATE POLICY "Barbers can view their own stock movements"
  ON public.stock_movements FOR SELECT
  USING (
    has_role(auth.uid(), 'barber'::app_role) 
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- Barbers can insert stock movements
CREATE POLICY "Barbers can insert stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'barber'::app_role));

-- Barbers can update their own stock movements
CREATE POLICY "Barbers can update their own stock movements"
  ON public.stock_movements FOR UPDATE
  USING (
    has_role(auth.uid(), 'barber'::app_role) 
    AND (created_by = auth.uid() OR created_by IS NULL)
  );

-- Barbers can delete their own stock movements
CREATE POLICY "Barbers can delete their own stock movements"
  ON public.stock_movements FOR DELETE
  USING (
    has_role(auth.uid(), 'barber'::app_role) 
    AND (created_by = auth.uid() OR created_by IS NULL)
  );