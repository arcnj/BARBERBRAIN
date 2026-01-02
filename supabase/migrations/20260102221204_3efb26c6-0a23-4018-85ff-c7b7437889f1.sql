-- Create birthday_coupons table
CREATE TABLE public.birthday_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  discount_percentage NUMERIC DEFAULT 10,
  discount_value NUMERIC DEFAULT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())
);

-- Enable RLS
ALTER TABLE public.birthday_coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Barbers and admins can manage birthday coupons"
ON public.birthday_coupons
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own birthday coupons"
ON public.birthday_coupons
FOR SELECT
USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Create birthday_settings table for configuration
CREATE TABLE public.birthday_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  default_discount_percentage NUMERIC DEFAULT 10,
  days_before INTEGER DEFAULT 7,
  days_after INTEGER DEFAULT 7,
  auto_create_coupon BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.birthday_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for settings
CREATE POLICY "Anyone can view birthday settings"
ON public.birthday_settings
FOR SELECT
USING (true);

CREATE POLICY "Barbers and admins can manage birthday settings"
ON public.birthday_settings
FOR ALL
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.birthday_settings (enabled, default_discount_percentage, days_before, days_after, auto_create_coupon)
VALUES (true, 10, 7, 7, true);

-- Create index for faster birthday queries
CREATE INDEX idx_profiles_birth_date ON public.profiles(birth_date);
CREATE INDEX idx_birthday_coupons_profile_year ON public.birthday_coupons(profile_id, year);