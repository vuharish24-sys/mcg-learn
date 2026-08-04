-- Allow authenticated portal users to upload media into the public learning-content bucket.
DROP POLICY IF EXISTS "Authenticated learning content upload" ON storage.objects;
CREATE POLICY "Authenticated learning content upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'learning-content');

DROP POLICY IF EXISTS "Authenticated learning content update" ON storage.objects;
CREATE POLICY "Authenticated learning content update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'learning-content')
WITH CHECK (bucket_id = 'learning-content');
