import type { DndClass } from '../types/character';

// Map nom de classe -> base de fichier (placez les images dans /public/*.png)
export function getImageBaseForClass(className: DndClass): string | null {
  switch (className) {
    case 'Guerrier': return 'Guerrier';
    case 'Magicien': return 'Magicien';
    case 'Roublard': return 'Voleur';     // Voleur.png
    case 'Clerc': return 'Clerc';
    case 'Rôdeur': return 'Rodeur';       // sans accent
    case 'Barbare': return 'Barbare';
    case 'Barde': return 'Barde';
    case 'Druide': return 'Druide';
    case 'Moine': return 'Moine';
    case 'Paladin': return 'Paladin';
    case 'Ensorceleur': return 'Ensorceleur';
    case 'Occultiste': return 'Occultiste';
    default: return null;
  }
}

export function getClassImageUrl(className: DndClass): string | null {
  const base = getImageBaseForClass(className);
  return base ? `/${base}.png` : null; // racine du dossier public
}