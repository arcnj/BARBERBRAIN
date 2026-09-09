CREATE TABLE public.subscription_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  subscription_id UUID REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'new',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id UUID REFERENCES public.subscription_payments(id) ON DELETE SET NULL,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscription_requests_kind_check CHECK (kind IN ('new','renewal')),
  CONSTRAINT subscription_requests_status_check CHECK (status IN ('pending','approved','rejected'))
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscription requests"
ON public.subscription_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Barbers view subscription requests"
ON public.subscription_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'barber'));

CREATE POLICY "Customers view own subscription requests"
ON public.subscription_requests FOR SELECT TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Customers create own pending requests"
ON public.subscription_requests FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid() AND status = 'pending' AND payment_id IS NULL AND decided_by IS NULL);

CREATE UNIQUE INDEX subscription_requests_one_pending_per_customer
ON public.subscription_requests (customer_id) WHERE status = 'pending';

CREATE INDEX subscription_requests_status_idx ON public.subscription_requests (status, created_at DESC);

CREATE TRIGGER update_subscription_requests_updated_at
BEFORE UPDATE ON public.subscription_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.approve_subscription_request(
  p_request_id UUID,
  p_amount NUMERIC,
  p_paid_at DATE,
  p_method TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.subscription_cycles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req public.subscription_requests;
  v_sub public.customer_subscriptions;
  v_cycle public.subscription_cycles;
  v_payment_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem aprovar pedidos';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

  SELECT * INTO v_req FROM public.subscription_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF v_req.status <> 'pending' THEN
    SELECT * INTO v_cycle FROM public.subscription_cycles
    WHERE subscription_id = v_req.subscription_id AND status = 'current'
    ORDER BY period_end DESC LIMIT 1;
    RETURN v_cycle;
  END IF;

  -- assinatura existente do cliente (renovação) ou criação de uma nova
  SELECT * INTO v_sub FROM public.customer_subscriptions
  WHERE id = v_req.subscription_id;

  IF v_sub.id IS NULL THEN
    SELECT * INTO v_sub FROM public.customer_subscriptions
    WHERE customer_id = v_req.customer_id
      AND status <> 'cancelled'
    ORDER BY current_period_end DESC
    LIMIT 1;
  END IF;

  IF v_sub.id IS NULL THEN
    INSERT INTO public.customer_subscriptions (
      customer_id, plan_id, start_date, current_period_end, status
    ) VALUES (
      v_req.customer_id, v_req.plan_id, p_paid_at, p_paid_at, 'active'
    ) RETURNING * INTO v_sub;
  ELSIF v_sub.plan_id <> v_req.plan_id THEN
    UPDATE public.customer_subscriptions
    SET plan_id = v_req.plan_id, status = 'active'
    WHERE id = v_sub.id
    RETURNING * INTO v_sub;
  END IF;

  v_cycle := public.confirm_subscription_payment(v_sub.id, p_amount, p_paid_at, p_method, p_notes);

  SELECT payment_id INTO v_payment_id FROM public.subscription_cycles WHERE id = v_cycle.id;

  UPDATE public.subscription_requests
  SET status = 'approved',
      subscription_id = v_sub.id,
      payment_id = v_payment_id,
      decided_by = auth.uid(),
      decided_at = now()
  WHERE id = p_request_id;

  RETURN v_cycle;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_subscription_request(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem recusar pedidos';
  END IF;

  UPDATE public.subscription_requests
  SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
  WHERE id = p_request_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.approve_subscription_request(UUID, NUMERIC, DATE, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_subscription_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_subscription_request(UUID, NUMERIC, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_subscription_request(UUID) TO authenticated;