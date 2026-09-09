-- 1. CYCLES
CREATE TABLE public.subscription_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  customer_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'current',
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_cycles TO authenticated;
GRANT ALL ON public.subscription_cycles TO service_role;
ALTER TABLE public.subscription_cycles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX subscription_cycles_one_current
  ON public.subscription_cycles (subscription_id)
  WHERE status = 'current';
CREATE INDEX subscription_cycles_subscription_idx ON public.subscription_cycles (subscription_id, period_end DESC);

CREATE POLICY "Admins manage cycles" ON public.subscription_cycles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers view cycles" ON public.subscription_cycles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'barber'));

CREATE POLICY "Customers view own cycles" ON public.subscription_cycles
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE TRIGGER update_subscription_cycles_updated_at
  BEFORE UPDATE ON public.subscription_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. USAGES
CREATE TABLE public.subscription_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.subscription_cycles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES public.barbers(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  reversed_by UUID,
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_usages TO authenticated;
GRANT ALL ON public.subscription_usages TO service_role;
ALTER TABLE public.subscription_usages ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX subscription_usages_unique_order_service
  ON public.subscription_usages (cycle_id, order_id, service_id)
  WHERE order_id IS NOT NULL AND service_id IS NOT NULL;
CREATE INDEX subscription_usages_cycle_idx ON public.subscription_usages (cycle_id, status);

CREATE POLICY "Admins manage usages" ON public.subscription_usages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers view usages" ON public.subscription_usages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'barber'));

CREATE POLICY "Barbers insert usages" ON public.subscription_usages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'barber'));

CREATE POLICY "Customers view own usages" ON public.subscription_usages
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

-- 3. PAYMENTS extra columns
ALTER TABLE public.subscription_payments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS expected_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cycle_id UUID;

-- 4. Backfill: one current cycle per existing subscription
INSERT INTO public.subscription_cycles (subscription_id, plan_id, customer_id, period_start, period_end, status)
SELECT s.id, s.plan_id, s.customer_id, s.start_date, s.current_period_end,
       CASE WHEN s.status = 'cancelled' THEN 'closed' ELSE 'current' END
FROM public.customer_subscriptions s
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_cycles c WHERE c.subscription_id = s.id
);

UPDATE public.subscription_payments
SET payment_method = COALESCE(payment_method, method, 'other'),
    confirmed_at = COALESCE(confirmed_at, paid_at)
WHERE payment_method IS NULL OR confirmed_at IS NULL;

-- 5. Central business function
CREATE OR REPLACE FUNCTION public.confirm_subscription_payment(
  p_subscription_id UUID,
  p_amount NUMERIC,
  p_paid_at DATE,
  p_method TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.subscription_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.customer_subscriptions;
  v_plan public.subscription_plans;
  v_current public.subscription_cycles;
  v_new public.subscription_cycles;
  v_payment_id UUID;
  v_start DATE;
  v_end DATE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem confirmar pagamentos';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_subscription_id::text, 0));

  SELECT * INTO v_sub FROM public.customer_subscriptions WHERE id = p_subscription_id;
  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'Assinatura não encontrada';
  END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_sub.plan_id;

  SELECT * INTO v_current
  FROM public.subscription_cycles
  WHERE subscription_id = p_subscription_id AND status = 'current'
  ORDER BY period_end DESC
  LIMIT 1;

  -- duplicate protection: a confirmed payment already created a cycle
  -- that starts at/after the current cycle end (i.e. already renewed)
  IF v_current.id IS NOT NULL AND v_current.period_start >= COALESCE(v_sub.current_period_end, v_current.period_start)
     AND EXISTS (
       SELECT 1 FROM public.subscription_payments
       WHERE cycle_id = v_current.id AND status = 'confirmed'
     ) THEN
    RETURN v_current;
  END IF;

  -- renewal policy (isolated block: future policies can replace this)
  IF v_current.id IS NOT NULL AND v_current.period_end > p_paid_at THEN
    v_start := v_current.period_end;   -- paid on time: keep the due date
  ELSE
    v_start := p_paid_at;              -- late payment: cycle starts on payment date
  END IF;
  v_end := (v_start + INTERVAL '1 month')::date;

  INSERT INTO public.subscription_payments (
    subscription_id, amount, expected_amount, paid_at, method, payment_method,
    period_end, notes, status, confirmed_by, confirmed_at
  ) VALUES (
    p_subscription_id, p_amount, COALESCE(v_plan.price, p_amount), p_paid_at::timestamptz,
    p_method, p_method, v_end, p_notes, 'confirmed', auth.uid(), now()
  ) RETURNING id INTO v_payment_id;

  IF v_current.id IS NOT NULL THEN
    UPDATE public.subscription_cycles SET status = 'closed' WHERE id = v_current.id;
  END IF;

  INSERT INTO public.subscription_cycles (
    subscription_id, plan_id, customer_id, period_start, period_end, status, payment_id
  ) VALUES (
    p_subscription_id, v_sub.plan_id, v_sub.customer_id, v_start, v_end, 'current', v_payment_id
  ) RETURNING * INTO v_new;

  UPDATE public.subscription_payments SET cycle_id = v_new.id WHERE id = v_payment_id;

  UPDATE public.customer_subscriptions
  SET current_period_end = v_end, status = 'active'
  WHERE id = p_subscription_id;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_subscription_payment(UUID, NUMERIC, DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_subscription_payment(UUID, NUMERIC, DATE, TEXT, TEXT) TO authenticated;

-- 6. Reverse usage
CREATE OR REPLACE FUNCTION public.reverse_subscription_usage(
  p_usage_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.subscription_usages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage public.subscription_usages;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem estornar utilizações';
  END IF;

  UPDATE public.subscription_usages
  SET status = 'reversed', reversed_by = auth.uid(), reversed_at = now(), reversal_reason = p_reason
  WHERE id = p_usage_id AND status = 'active'
  RETURNING * INTO v_usage;

  IF v_usage.id IS NULL THEN
    RAISE EXCEPTION 'Utilização não encontrada ou já estornada';
  END IF;

  RETURN v_usage;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_subscription_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverse_subscription_usage(UUID, TEXT) TO authenticated;