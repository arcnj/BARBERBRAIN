-- Allow barbers to insert their own financial records (for commissions)
CREATE POLICY "Barbers can insert their own financial records"
ON public.barber_financial_records
FOR INSERT
WITH CHECK (
  barber_id IN (
    SELECT id FROM barbers WHERE user_id = auth.uid()
  )
);

-- Also allow barbers to update their own records if needed
CREATE POLICY "Barbers can update their own financial records"
ON public.barber_financial_records
FOR UPDATE
USING (
  barber_id IN (
    SELECT id FROM barbers WHERE user_id = auth.uid()
  )
);