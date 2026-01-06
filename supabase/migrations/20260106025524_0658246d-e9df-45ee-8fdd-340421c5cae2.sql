-- Create storage bucket for barbershop assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('barbershop', 'barbershop', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for barbershop bucket - allow authenticated users to upload
CREATE POLICY "Authenticated users can upload barbershop assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barbershop');

-- Allow public read access
CREATE POLICY "Public can view barbershop assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'barbershop');

-- Allow authenticated users to update/delete
CREATE POLICY "Authenticated users can update barbershop assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'barbershop');

CREATE POLICY "Authenticated users can delete barbershop assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'barbershop');

-- Add logo_url column to barbershop_settings
ALTER TABLE public.barbershop_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT;