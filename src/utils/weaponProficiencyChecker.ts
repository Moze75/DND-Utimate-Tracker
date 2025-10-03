// Données des armes par catégorie (depuis le fichier Armes.md)
const ARMES_COURANTES = [
  'Bâton de combat',
  'Dague',
  'Gourdin',
  'Hachette',
  'Javeline',
  'Lance',
  'Marteau léger',
  'Masse d\'armes',
  'Massue',
  'Serpe',
  'Arbalète légère',
  'Arc court',
  'Fléchette',
  'Fronde'
];

const ARMES_DE_GUERRE = [
  'Cimeterre',
  'Coutille',
  'Épée à deux mains',
  'Épée courte',
  'Épée longue',
  'Fléau d\'armes',
  'Fouet',
  'Hache à deux mains',
  'Hache d\'armes',
  'Hallebarde',
  'Lance d\'arçon',
  'Maillet d\'armes',
  'Marteau de guerre',
  'Morgenstern',
  'Pic de guerre',
  'Pique',
  'Rapière',
  'Trident',
  'Arbalète de poing',
  'Arbalète lourde',
  'Arc long',
  'Mousquet',
  'Pistolet',
  'Sarbacane'
];

const ARMES_GUERRE_FINESSE_OU_LEGERE = [
  'Cimeterre',
  'Épée courte',
  'Fouet',
  'Rapière'
];

const ARMES_GUERRE_LEGERE = [
  'Cimeterre',
  'Épée courte',
  'Arbalète de poing'
];

// Variantes possibles des noms d'armes (pour gérer les différences d'orthographe)
const WEAPON_NAME_VARIANTS: { [key: string]: string[] } = {
  'Dague': ['Dague', 'Poignard'],
  'Épée courte': ['Épée courte', 'Epée courte', 'Epee courte'],
  'Épée longue': ['Épée longue', 'Epée longue', 'Epee longue'],
  'Épée à deux mains': ['Épée à deux mains', 'Epée à deux mains', 'Epee a deux mains'],
  'Arbalète légère': ['Arbalète légère', 'Arbalete legere'],
  'Arbalète lourde': ['Arbalète lourde', 'Arbalete lourde'],
  'Arbalète de poing': ['Arbalète de poing', 'Arbalete de poing'],
  'Rapière': ['Rapière', 'Rapiere'],
  'Cimeterre': ['Cimeterre', 'Cimetere'],
  'Hachette': ['Hachette', 'Hache de jet'],
  'Marteau léger': ['Marteau léger', 'Marteau leger', 'Petit marteau'],
  'Masse d\'armes': ['Masse d\'armes', 'Masse d\'arme', 'Masse darmes', 'Masse darme'],
  'Fléau d\'armes': ['Fléau d\'armes', 'Fléau d\'arme', 'Fleau darmes', 'Fleau darme']
};

// Fonction pour normaliser le nom d'arme (supprimer accents, casse, espaces, apostrophes)
function normalizeWeaponName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer accents
    .replace(/[']/g, '') // supprimer apostrophes
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour vérifier si une arme fait partie d'une catégorie
function isWeaponInCategory(weaponName: string, category: string[]): boolean {
  const normalizedWeapon = normalizeWeaponName(weaponName);
  
  // Vérifier dans la catégorie principale
  for (const catWeapon of category) {
    if (normalizeWeaponName(catWeapon) === normalizedWeapon) {
      return true;
    }
    
    // Vérifier les variantes
    const variants = WEAPON_NAME_VARIANTS[catWeapon] || [];
    for (const variant of variants) {
      if (normalizeWeaponName(variant) === normalizedWeapon) {
        return true;
      }
    }
  }
  
  return false;
}

// Interface pour le résultat de vérification
export interface WeaponProficiencyCheck {
  isProficient: boolean;
  reason: string;
  category?: string;
  shouldApplyProficiencyBonus: boolean;
  proficiencySource?: string; // Source de la maîtrise (classe, don, etc.)
}

// Fonction principale de vérification des maîtrises d'armes
export function checkWeaponProficiency(
  weaponName: string, 
  playerProficiencies: string[]
): WeaponProficiencyCheck {
  
  if (!weaponName || !weaponName.trim()) {
    return {
      isProficient: false,
      reason: 'Nom d\'arme manquant',
      shouldApplyProficiencyBonus: false
    };
  }

  // Normaliser les maîtrises du joueur
  const normalizedProficiencies = playerProficiencies.map(p => p.toLowerCase().trim());
  
  // Vérifier chaque catégorie de maîtrise
  for (let i = 0; i < normalizedProficiencies.length; i++) {
    const proficiency = normalizedProficiencies[i];
    const originalProficiency = playerProficiencies[i];
    
    // 1. Armes courantes
    if (proficiency.includes('armes courantes') || proficiency.includes('arme courante')) {
      if (isWeaponInCategory(weaponName, ARMES_COURANTES)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes courantes',
          category: 'Armes courantes',
          shouldApplyProficiencyBonus: true,
          proficiencySource: originalProficiency
        };
      }
    }
    
    // 2. Armes de guerre (général) - ne doit pas matcher les versions spécifiques
    if (proficiency.includes('armes de guerre') && 
        !proficiency.includes('propriété') && 
        !proficiency.includes('finesse') && 
        !proficiency.includes('légère') &&
        !proficiency.includes('legere') &&
        !proficiency.includes('dotées')) {
      if (isWeaponInCategory(weaponName, ARMES_DE_GUERRE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre',
          category: 'Armes de guerre',
          shouldApplyProficiencyBonus: true,
          proficiencySource: originalProficiency
        };
      }
    }
    
    // 3. Armes de guerre avec propriété Finesse ou Légère
    if ((proficiency.includes('finesse ou légère') || proficiency.includes('finesse ou legere')) ||
        (proficiency.includes('finesse') && proficiency.includes('légère')) ||
        (proficiency.includes('finesse') && proficiency.includes('legere'))) {
      if (isWeaponInCategory(weaponName, ARMES_GUERRE_FINESSE_OU_LEGERE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre avec propriété Finesse ou Légère',
          category: 'Armes de guerre (Finesse ou Légère)',
          shouldApplyProficiencyBonus: true,
          proficiencySource: originalProficiency
        };
      }
    }
    
    // 4. Armes de guerre dotées de la propriété Légère
    if (proficiency.includes('dotées de la propriété légère') ||
        proficiency.includes('dotees de la propriete legere') ||
        (proficiency.includes('légère') && !proficiency.includes('finesse')) ||
        (proficiency.includes('legere') && !proficiency.includes('finesse'))) {
      if (isWeaponInCategory(weaponName, ARMES_GUERRE_LEGERE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre dotées de la propriété Légère',
          category: 'Armes de guerre (Légère)',
          shouldApplyProficiencyBonus: true,
          proficiencySource: originalProficiency
        };
      }
    }
  }

  // Si aucune maîtrise trouvée, déterminer la catégorie de l'arme
  let category = 'Inconnue';
  if (isWeaponInCategory(weaponName, ARMES_COURANTES)) {
    category = 'Armes courantes';
  } else if (isWeaponInCategory(weaponName, ARMES_GUERRE_FINESSE_OU_LEGERE)) {
    category = 'Armes de guerre (Finesse ou Légère)';
  } else if (isWeaponInCategory(weaponName, ARMES_GUERRE_LEGERE)) {
    category = 'Armes de guerre (Légère)';
  } else if (isWeaponInCategory(weaponName, ARMES_DE_GUERRE)) {
    category = 'Armes de guerre';
  }

  return {
    isProficient: false,
    reason: `Aucune maîtrise pour cette arme (${category})`,
    category,
    shouldApplyProficiencyBonus: false
  };
}

// Maîtrises d'armes par classe (selon le document de référence)
const CLASS_WEAPON_PROFICIENCIES: { [key: string]: string[] } = {
  'Guerrier': ['Armes courantes', 'Armes de guerre'],
  'Magicien': ['Armes courantes'],
  'Roublard': ['Armes courantes', 'Armes de guerre présentant la propriété Finesse ou Légère'],
  'Clerc': ['Armes courantes'],
  'Rôdeur': ['Armes courantes', 'Armes de guerre'],
  'Barbare': ['Armes courantes', 'Armes de guerre'],
  'Barde': ['Armes courantes', 'Armes de guerre dotées de la propriété Légère'],
  'Druide': ['Armes courantes'],
  'Moine': ['Armes courantes', 'Armes de guerre dotées de la propriété Légère'],
  'Paladin': ['Armes courantes', 'Armes de guerre'],
  'Ensorceleur': ['Armes courantes'],
  'Occultiste': ['Armes courantes']
};

// Fonction pour extraire toutes les maîtrises d'armes du joueur
export function getPlayerWeaponProficiencies(player: any): string[] {
  const proficiencies: string[] = [];
  
  try {
    // 1. Maîtrises depuis les stats du créateur de personnage
    if (player?.stats?.creator_meta?.weapon_proficiencies) {
      const creatorProfs = player.stats.creator_meta.weapon_proficiencies;
      if (Array.isArray(creatorProfs)) {
        proficiencies.push(...creatorProfs);
      }
    }
    
    // 2. Maîtrises depuis les stats générales
    if (player?.stats?.weapon_proficiencies) {
      const statsProfs = player.stats.weapon_proficiencies;
      if (Array.isArray(statsProfs)) {
        proficiencies.push(...statsProfs);
      }
    }
    
    // 3. Maîtrises de classe par défaut
    if (player?.class && CLASS_WEAPON_PROFICIENCIES[player.class]) {
      const classProfs = CLASS_WEAPON_PROFICIENCIES[player.class];
      proficiencies.push(...classProfs);
    }
    
    // 4. Supprimer les doublons et filtrer les valeurs vides
    const uniqueProficiencies = [...new Set(proficiencies)]
      .filter(prof => prof && typeof prof === 'string' && prof.trim().length > 0);
    
    return uniqueProficiencies;
    
  } catch (error) {
    console.error('Erreur lors de l\'extraction des maîtrises d\'armes:', error);
    
    // Fallback: au moins les maîtrises de classe si possible
    if (player?.class && CLASS_WEAPON_PROFICIENCIES[player.class]) {
      return CLASS_WEAPON_PROFICIENCIES[player.class];
    }
    
    return [];
  }
}

// Fonction utilitaire pour obtenir la liste complète des armes par catégorie
export function getWeaponsByCategory() {
  return {
    courantes: ARMES_COURANTES,
    guerre: ARMES_DE_GUERRE,
    guerreFinesseLegere: ARMES_GUERRE_FINESSE_OU_LEGERE,
    guerreLegere: ARMES_GUERRE_LEGERE
  };
}

// Fonction pour vérifier si une arme spécifique existe dans la base de données
export function isValidWeapon(weaponName: string): boolean {
  if (!weaponName || !weaponName.trim()) return false;
  
  const allWeapons = [
    ...ARMES_COURANTES,
    ...ARMES_DE_GUERRE
  ];
  
  return isWeaponInCategory(weaponName, allWeapons);
}

// Fonction pour obtenir la catégorie d'une arme
export function getWeaponCategory(weaponName: string): string {
  if (!weaponName || !weaponName.trim()) return 'Inconnue';
  
  if (isWeaponInCategory(weaponName, ARMES_COURANTES)) {
    return 'Armes courantes';
  } else if (isWeaponInCategory(weaponName, ARMES_GUERRE_FINESSE_OU_LEGERE)) {
    return 'Armes de guerre (Finesse ou Légère)';
  } else if (isWeaponInCategory(weaponName, ARMES_GUERRE_LEGERE)) {
    return 'Armes de guerre (Légère)';
  } else if (isWeaponInCategory(weaponName, ARMES_DE_GUERRE)) {
    return 'Armes de guerre';
  }
  
  return 'Inconnue';
}

// Fonction pour obtenir toutes les maîtrises disponibles
export function getAllAvailableProficiencies(): string[] {
  return [
    'Armes courantes',
    'Armes de guerre',
    'Armes de guerre présentant la propriété Finesse ou Légère',
    'Armes de guerre dotées de la propriété Légère'
  ];
}

// Fonction de debug pour tester une maîtrise
export function debugWeaponProficiency(weaponName: string, playerProficiencies: string[]): void {
  console.group(`🗡️ Debug maîtrise: ${weaponName}`);
  
  console.log('Maîtrises du joueur:', playerProficiencies);
  console.log('Catégorie de l\'arme:', getWeaponCategory(weaponName));
  console.log('Arme valide:', isValidWeapon(weaponName));
  
  const result = checkWeaponProficiency(weaponName, playerProficiencies);
  console.log('Résultat:', result);
  
  console.groupEnd();
}