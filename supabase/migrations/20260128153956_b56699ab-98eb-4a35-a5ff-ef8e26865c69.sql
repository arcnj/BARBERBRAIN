-- Add service_id column to barber_goals for service-specific goals
ALTER TABLE public.barber_goals 
ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_barber_goals_service_id ON public.barber_goals(service_id);

-- Add comment for documentation
COMMENT ON COLUMN public.barber_goals.service_id IS 'Optional: specific service for service-type goals';