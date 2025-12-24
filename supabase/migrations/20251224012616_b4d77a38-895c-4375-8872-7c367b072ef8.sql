-- Create service_combos table
CREATE TABLE public.service_combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promotional_price NUMERIC NOT NULL,
  original_price NUMERIC NOT NULL DEFAULT 0,
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create combo_services junction table
CREATE TABLE public.combo_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.service_combos(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(combo_id, service_id)
);

-- Enable RLS
ALTER TABLE public.service_combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_combos
CREATE POLICY "Anyone can view active combos with available slots"
ON public.service_combos
FOR SELECT
USING (active = true AND (max_redemptions IS NULL OR current_redemptions < max_redemptions));

CREATE POLICY "Barbers and admins can manage combos"
ON public.service_combos
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for combo_services
CREATE POLICY "Anyone can view combo services"
ON public.combo_services
FOR SELECT
USING (true);

CREATE POLICY "Barbers and admins can manage combo services"
ON public.combo_services
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_service_combos_updated_at
BEFORE UPDATE ON public.service_combos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();