-- Allow authenticated users to delete objects they manage in learning-content.
DROP POLICY IF EXISTS "Authenticated learning content delete" ON storage.objects;
CREATE POLICY "Authenticated learning content delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'learning-content');
