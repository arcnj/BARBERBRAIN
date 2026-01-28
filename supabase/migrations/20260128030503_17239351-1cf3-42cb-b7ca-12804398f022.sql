-- Create enum for goal types
CREATE TYPE public.goal_type AS ENUM ('cuts', 'revenue', 'services', 'product_sales');

-- Create enum for goal status
CREATE TYPE public.goal_status AS ENUM ('active', 'completed', 'expired');

-- Create barber_goals table
CREATE TABLE public.barber_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  goal_type goal_type NOT NULL,
  target_value NUMERIC NOT NULL CHECK (target_value > 0),
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  reward_value NUMERIC NOT NULL CHECK (reward_value >= 0),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  status goal_status NOT NULL DEFAULT 'active',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Only one active goal per barber per month/year
  UNIQUE (barber_id, month, year)
);

-- Create barber_commissions table for commission settings
CREATE TABLE public.barber_commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE UNIQUE,
  service_commission_percent NUMERIC NOT NULL DEFAULT 50 CHECK (service_commission_percent >= 0 AND service_commission_percent <= 100),
  product_commission_percent NUMERIC NOT NULL DEFAULT 10 CHECK (product_commission_percent >= 0 AND product_commission_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create barber_financial_records for tracking earnings
CREATE TABLE public.barber_financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('service_commission', 'product_commission', 'goal_reward')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  reference_id UUID, -- Can reference order_id or goal_id
  description TEXT,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barber_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_financial_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for barber_goals
CREATE POLICY "Admins can manage all goals"
  ON public.barber_goals FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers can view their own goals"
  ON public.barber_goals FOR SELECT
  USING (
    barber_id IN (
      SELECT id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for barber_commission_settings
CREATE POLICY "Admins can manage commission settings"
  ON public.barber_commission_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers can view their own commission settings"
  ON public.barber_commission_settings FOR SELECT
  USING (
    barber_id IN (
      SELECT id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for barber_financial_records
CREATE POLICY "Admins can manage all financial records"
  ON public.barber_financial_records FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers can view their own financial records"
  ON public.barber_financial_records FOR SELECT
  USING (
    barber_id IN (
      SELECT id FROM public.barbers WHERE user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_barber_goals_updated_at
  BEFORE UPDATE ON public.barber_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barber_commission_settings_updated_at
  BEFORE UPDATE ON public.barber_commission_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_barber_goals_barber_month_year ON public.barber_goals(barber_id, month, year);
CREATE INDEX idx_barber_financial_records_barber_month_year ON public.barber_financial_records(barber_id, month, year);