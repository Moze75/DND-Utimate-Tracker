/*
  # Fix group treasury table

  1. Changes
    - Ensure group treasury table has initial record
    - Fix ON CONFLICT behavior
*/

-- Supprime tous les enregistrements existants
DELETE FROM group_treasury;

-- Insère l'enregistrement initial avec l'ID spécifique
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO UPDATE
SET gold = EXCLUDED.gold,
    silver = EXCLUDED.silver,
    copper = EXCLUDED.copper;