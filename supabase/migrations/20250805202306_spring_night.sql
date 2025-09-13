/*
  # Création du bucket sorts pour les fichiers de sorts D&D

  1. Nouveau bucket
    - Création d'un bucket 'sorts' pour stocker les fichiers de sorts
    - Accès public en lecture pour permettre le chargement des sorts
    - Accès en écriture pour les utilisateurs authentifiés

  2. Sécurité
    - Accès public en lecture
    - Accès en écriture limité aux utilisateurs authentifiés
    - Politiques RLS appropriées
*/

-- Supprimer le bucket s'il existe déjà (pour le recréer proprement)
DELETE FROM storage.buckets WHERE id = 'sorts';

-- Création du bucket pour les sorts
INSERT INTO storage.buckets (id, name, public)
VALUES ('sorts', 'sorts', true);

-- Supprimer les anciennes politiques s'elles existent
DROP POLICY IF EXISTS "Accès public aux sorts" ON storage.objects;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent gérer les sorts" ON storage.objects;

-- Politique pour permettre l'accès public en lecture
CREATE POLICY "Public read access to sorts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sorts');

-- Politique pour permettre aux utilisateurs authentifiés de gérer les fichiers de sorts
CREATE POLICY "Authenticated users can manage sorts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'sorts')
WITH CHECK (bucket_id = 'sorts');

-- Vérification que le bucket a été créé
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'sorts'
    ) THEN
        RAISE NOTICE '✅ Bucket "sorts" créé avec succès';
        RAISE NOTICE '✅ Politiques d''accès configurées';
        RAISE NOTICE '📁 Vous pouvez maintenant uploader le fichier "Sorts 2024.md"';
    ELSE
        RAISE WARNING '❌ Échec de la création du bucket "sorts"';
    END IF;
END $$;