/*
  # Ajout des bonus manuels aux attaques
  
  1. Modifications
    - Ajout de la colonne `manual_attack_bonus` à la table `attacks`
    - Ajout de la colonne `manual_damage_bonus` à la table `attacks`
    - Ces colonnes permettent de forcer des valeurs spécifiques
*/

-- Ajout des colonnes pour les bonus manuels
ALTER TABLE attacks
ADD COLUMN IF NOT EXISTS manual_attack_bonus integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS manual_damage_bonus integer DEFAULT NULL;