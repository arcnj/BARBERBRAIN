-- Add barber_id column to promotions table
ALTER TABLE public.promotions 
ADD COLUMN barber_id uuid REFERENCES public.barbers(id) ON DELETE SET NULL;