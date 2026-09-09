-- PLANS
CREATE TABLE public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0),
  benefits text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);

-- SUBSCRIPTIONS
CREATE TABLE public.customer_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  auto_reminder boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_subscriptions_period_end ON public.customer_subscriptions (current_period_end);
CREATE INDEX idx_customer_subscriptions_customer ON public.customer_subscriptions (customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_subscriptions TO authenticated;
GRANT ALL ON public.customer_subscriptions TO service_role;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage subscriptions" ON public.customer_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Barbers view subscriptions" ON public.customer_subscriptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'barber'));
CREATE POLICY "Customers view own subscription" ON public.customer_subscriptions FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- PAYMENTS
CREATE TABLE public.subscription_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text,
  period_end date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscription_payments_sub ON public.subscription_payments (subscription_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage payments" ON public.subscription_payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Barbers view payments" ON public.subscription_payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'barber'));
CREATE POLICY "Customers view own payments" ON public.subscription_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.customer_subscriptions s WHERE s.id = subscription_id AND s.customer_id = auth.uid()));

-- REMINDERS LOG
CREATE TABLE public.subscription_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  period_end date NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  provider_message_id text,
  error text,
  message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, period_end, channel)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_reminders TO authenticated;
GRANT ALL ON public.subscription_reminders TO service_role;
ALTER TABLE public.subscription_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reminders" ON public.subscription_reminders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Barbers view reminders" ON public.subscription_reminders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'barber'));

-- REMINDER SETTINGS
CREATE TABLE public.subscription_reminder_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  days_before integer NOT NULL DEFAULT 3 CHECK (days_before >= 0 AND days_before <= 30),
  message_template text NOT NULL DEFAULT 'Oi {nome}! Sua assinatura {plano} vence em {data}. Renove para continuar aproveitando seus atendimentos. Qualquer dúvida, chama aqui!',
  twilio_template_sid text,
  paused_reason text,
  paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_reminder_settings TO authenticated;
GRANT ALL ON public.subscription_reminder_settings TO service_role;
ALTER TABLE public.subscription_reminder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reminder settings" ON public.subscription_reminder_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view reminder settings" ON public.subscription_reminder_settings FOR SELECT TO authenticated USING (true);

INSERT INTO public.subscription_reminder_settings (enabled) VALUES (true);

-- JOB LOCKS (server-side only)
CREATE TABLE public.job_locks (
  job_name text NOT NULL PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

-- TRIGGERS
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_subscriptions_updated_at BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscription_reminder_settings_updated_at BEFORE UPDATE ON public.subscription_reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();