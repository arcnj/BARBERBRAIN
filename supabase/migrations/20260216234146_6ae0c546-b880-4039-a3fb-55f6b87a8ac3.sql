
-- Add categories array column to services
ALTER TABLE public.services ADD COLUMN categories text[] DEFAULT ARRAY[]::text[];

-- Populate categories from existing category column
UPDATE public.services SET categories = ARRAY[category];
