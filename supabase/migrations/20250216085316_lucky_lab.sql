/*
  # Ajout des ressources de classe

  1. Modifications
    - Ajout de la colonne `class_resources` à la table `players`
    - Mise à jour des joueurs existants avec une structure de ressources vide

  2. Structure
    La colonne `class_resources` stocke un objet JSON avec les ressources spécifiques à chaque classe :
    - Rage (Barbare)
    - Inspiration bardique (Barde)
    - Conduit divin (Clerc)
    - Forme sauvage (Druide)
    - Points de sorcellerie (Ensorceleur)
    - Sursaut d'action (Guerrier)
    - Récupération arcanique (Magicien)
    - Points de ki (Moine)
    - Imposition des mains (Paladin)
    - Ennemi juré (Rôdeur)
    - Attaque sournoise (Roublard)
    - Magie des pactes (Sorcier)
*/

-- Ajout de la colonne class_resources
ALTER TABLE players
ADD COLUMN IF NOT EXISTS class_resources jsonb DEFAULT jsonb_build_object();

-- Suppression de la colonne ki_points qui est maintenant gérée dans class_resources
ALTER TABLE players
DROP COLUMN IF EXISTS ki_points;