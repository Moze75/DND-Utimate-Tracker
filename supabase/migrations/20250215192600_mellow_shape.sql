/*
  # Correction de l'ID du trésor du groupe

  1. Changements
    - Mise à jour de l'ID du trésor du groupe pour utiliser un ID fixe
    - Suppression de l'ancien trésor s'il existe
    - Création d'un nouveau trésor avec l'ID 1

  2. Notes
    - Cette migration assure qu'il n'y a qu'un seul trésor de groupe avec l'ID 1
*/

-- Supprime tous les trésors existants
DELETE FROM group_treasury;

-- Crée un nouveau trésor avec l'ID 1
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;