-- Add image_url column to promotions table
ALTER TABLE public.promotions 
ADD COLUMN image_url text;

-- Create storage bucket for promotion banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-banners', 'promotion-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view promotion banners (public bucket)
CREATE POLICY "Anyone can view promotion banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotion-banners');

-- Allow barbers and admins to upload promotion banners
CREATE POLICY "Barbers and admins can upload promotion banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'promotion-banners' 
  AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow barbers and admins to update promotion banners
CREATE POLICY "Barbers and admins can update promotion banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'promotion-banners' 
  AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow barbers and admins to delete promotion banners
CREATE POLICY "Barbers and admins can delete promotion banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'promotion-banners' 
  AND (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);