-- Create storage bucket for barber avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('barbers', 'barbers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for barber avatars bucket
CREATE POLICY "Anyone can view barber avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbers');

CREATE POLICY "Barbers and admins can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbers' 
  AND (has_role(auth.uid(), 'barber') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Barbers and admins can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbers' 
  AND (has_role(auth.uid(), 'barber') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Barbers and admins can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbers' 
  AND (has_role(auth.uid(), 'barber') OR has_role(auth.uid(), 'admin'))
);