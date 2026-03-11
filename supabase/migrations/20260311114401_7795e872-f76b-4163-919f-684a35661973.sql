CREATE POLICY "Authenticated users can upload peak images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'peak-images');

CREATE POLICY "Users can delete own peak images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'peak-images' AND auth.uid() = (storage.foldername(name))[1]::uuid);