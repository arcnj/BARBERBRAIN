-- Create barbershop settings table
CREATE TABLE IF NOT EXISTS public.barbershop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_phone text,
  name text DEFAULT 'Barbearia',
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.barbershop_settings (id, whatsapp_phone, name) 
VALUES ('00000000-0000-0000-0000-000000000001', '5511999999999', 'Nossa Barbearia')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view settings
CREATE POLICY "Anyone can view barbershop settings"
ON public.barbershop_settings
FOR SELECT
USING (true);

-- Only admins and barbers can manage settings
CREATE POLICY "Admins and barbers can manage barbershop settings"
ON public.barbershop_settings
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_barbershop_settings_updated_at
BEFORE UPDATE ON public.barbershop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();