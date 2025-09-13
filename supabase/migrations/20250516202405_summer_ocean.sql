/*
  # Fix static bucket configuration
  
  1. Changes
    - Reset bucket configuration
    - Add proper policies
    - Ensure public access
*/

-- Drop existing bucket if it exists
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'static';

-- Create bucket with proper configuration
INSERT INTO storage.buckets (id, name, public)
VALUES ('static', 'static', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'static');

-- Allow authenticated users to manage files
CREATE POLICY "Authenticated Users Can Manage Files"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'static')
WITH CHECK (bucket_id = 'static');