/*
  # Ajout des statistiques du joueur
  
  1. Modifications
    - Ajout des colonnes pour les statistiques du joueur :
      - armor_class (classe d'armure)
      - initiative
      - speed (vitesse)
      - proficiency_bonus (bonus de maîtrise)
      - inspiration
  
  2. Notes
    - Valeurs par défaut raisonnables définies pour chaque statistique
    - Utilisation de COALESCE pour la migration des données existantes
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS stats jsonb DEFAULT jsonb_build_object(
  'armor_class', 10,
  'initiative', 0,
  'speed', 30,
  'proficiency_bonus', 2,
  'inspiration', 0
);

-- Met à jour les joueurs existants qui n'ont pas de stats
UPDATE players
SET stats = jsonb_build_object(
  'armor_class', 10,
  'initiative', 0,
  'speed', 30,
  'proficiency_bonus', 2,
  'inspiration', 0
)
WHERE stats IS NULL;