-- Supprime les anciennes politiques de stockage
DROP POLICY IF EXISTS "Accès public aux avatars" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent télécharger des avatars" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs avatars" ON storage.objects;

-- Crée une nouvelle politique permissive pour le stockage
CREATE POLICY "Accès public au stockage"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Vérifie que le bucket avatars existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;