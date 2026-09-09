CREATE TABLE public.subscription_plan_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  monthly_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (plan_id, service_id)
);

GRANT SELECT ON public.subscription_plan_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plan_services TO authenticated;
GRANT ALL ON public.subscription_plan_services TO service_role;

ALTER TABLE public.subscription_plan_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan services"
  ON public.subscription_plan_services FOR SELECT
  USING (true);

CREATE POLICY "Admins manage plan services"
  ON public.subscription_plan_services FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subscription_plan_services_updated_at
  BEFORE UPDATE ON public.subscription_plan_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subscription_plan_services_plan ON public.subscription_plan_services(plan_id);

ALTER TABLE public.subscription_usages
  ADD COLUMN IF NOT EXISTS covered BOOLEAN NOT NULL DEFAULT true;