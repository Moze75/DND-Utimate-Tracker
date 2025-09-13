/*
  # Correction de l'UUID du trésor du groupe
  
  1. Changements
    - Supprime tous les trésors existants
    - Crée un nouveau trésor avec un UUID fixe
    - Assure que l'UUID est correctement formaté
*/

-- Supprime tous les trésors existants
DELETE FROM group_treasury;

-- Crée un nouveau trésor avec un UUID fixe
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO UPDATE
SET gold = 0, silver = 0, copper = 0;