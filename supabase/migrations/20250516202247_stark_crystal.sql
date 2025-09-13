/*
  # Add character silhouette image
  
  1. Changes
    - Create a new bucket for static assets
    - Upload character silhouette image
    - Add policies for public access
*/

-- Create bucket for static assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('static', 'static', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'static');

-- Create policy for authenticated uploads
CREATE POLICY "Authenticated Uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'static');