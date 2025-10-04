# Mise à jour LevelUpModal - Règles D&D 2024

## Date
2025-10-04

## Changements effectués

### 1. Sorts mineurs (cantrips)
✅ **Barde** : Corrigé selon les règles 2024
- Progression : 2→2→2→3→3→3→3→3→3→4→4→4→4→4→4→4→4→4→4→4

✅ **Ensorceleur** : Corrigé selon les règles 2024
- Progression : 4→4→4→5→5→5→5→5→5→6→6→6→6→6→6→6→6→6→6→6

✅ **Occultiste** : Corrigé selon les règles 2024
- Progression : 2→2→2→3→3→3→3→3→3→4→4→4→4→4→4→4→4→4→4→4

✅ **Clerc** : Corrigé selon les règles 2024
- Progression : 3→3→3→4→4→4→4→4→4→5→5→5→5→5→5→5→5→5→5→5

✅ **Druide** : Corrigé selon les règles 2024
- Progression : 2→2→2→3→3→3→3→3→3→4→4→4→4→4→4→4→4→4→4→4

✅ **Magicien** : Corrigé selon les règles 2024
- Progression : 3→3→3→4→4→4→4→4→4→5→5→5→5→5→5→5→5→5→5→5

### 2. Sorts préparés (fixed numbers)
✅ Tous les lanceurs de sorts utilisent maintenant des nombres fixes de sorts préparés au lieu de calculs dynamiques

**Barde** : 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22
**Ensorceleur** : 2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22
**Occultiste** : 2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15
**Clerc** : 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22
**Druide** : 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22
**Magicien** : 4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25
**Paladin** : 2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15
**Rôdeur** : 2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15

### 3. Emplacements de sorts (spell slots)
✅ **Full Casters** (Barde, Ensorceleur, Clerc, Druide, Magicien) : Tableaux complets créés pour les 20 niveaux

✅ **Half Casters** (Paladin, Rôdeur) : Tableaux complets créés pour les 20 niveaux

✅ **Occultiste** : Système Pact Magic implémenté correctement
- 1-2 emplacement(s) niveau 1-2
- 2 emplacements niveau 2-10
- 3 emplacements niveau 11-16
- 4 emplacements niveau 17-20
- Tous les emplacements au niveau maximum (5e) à partir du niveau 9

### 4. Refactoring du code
✅ Suppression des fonctions de calcul dynamique obsolètes (getWisModFromPlayer, getIntModFromPlayer)
✅ Conservation de getChaModFromPlayer pour les ressources du Barde
✅ Création d'une fonction centralisée getSpellSlotsByLevel réutilisable
✅ Élimination de la duplication de code entre handleLevelUp et handleLevelUpWithAutoSave
✅ Simplification de l'interface SpellInfo (un seul type 'prepared')

### 5. Documentation
✅ Ajout de commentaires indiquant la source des données (GitHub Ultimate_Tracker)
✅ Mention explicite des règles D&D 2024

## Tests à effectuer
- [ ] Tester le passage de niveau pour chaque classe de lanceur de sorts
- [ ] Vérifier les emplacements de sorts à différents niveaux
- [ ] Confirmer l'affichage correct des sorts mineurs et préparés dans le modal

## Source des données
https://github.com/Moze75/Ultimate_Tracker/tree/main/Tableau%20de%20progression%20des%20classes
