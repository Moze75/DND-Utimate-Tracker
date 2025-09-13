/*
  # Création du bucket pour les avatars

  1. Nouveau bucket
    - Création d'un bucket 'avatars' pour stocker les images de profil
  2. Sécurité
    - Accès public en lecture
    - Accès en écriture limité aux utilisateurs authentifiés
*/

-- Création du bucket pour les avatars s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre l'accès public en lecture
CREATE POLICY "Accès public aux avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Politique pour permettre aux utilisateurs authentifiés de télécharger des avatars
CREATE POLICY "Les utilisateurs authentifiés peuvent télécharger des avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres avatars
CREATE POLICY "Les utilisateurs peuvent supprimer leurs avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[2]);