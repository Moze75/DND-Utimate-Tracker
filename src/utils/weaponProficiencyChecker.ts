// Données des armes par catégorie (depuis Armes.md)
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

// Fonction pour normaliser le nom d'arme (supprimer accents, casse, espaces)
function normalizeWeaponName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprimer accents
    .replace(/\s+/g, ' ')
    .trim();
}

// Fonction pour vérifier si une arme fait partie d'une catégorie
function isWeaponInCategory(weaponName: string, category: string[]): boolean {
  const normalizedWeapon = normalizeWeaponName(weaponName);
  return category.some(catWeapon => 
    normalizeWeaponName(catWeapon) === normalizedWeapon
  );
}

// Interface pour le résultat de vérification
export interface WeaponProficiencyCheck {
  isProficient: boolean;
  reason: string;
  category?: string;
}

// Fonction principale de vérification
export function checkWeaponProficiency(
  weaponName: string, 
  playerProficiencies: string[]
): WeaponProficiencyCheck {
  
  // Normaliser les maîtrises du joueur
  const normalizedProficiencies = playerProficiencies.map(p => p.toLowerCase().trim());
  
  // Vérifier chaque catégorie de maîtrise
  for (const proficiency of normalizedProficiencies) {
    
    // Armes courantes
    if (proficiency.includes('armes courantes') || proficiency.includes('arme courante')) {
      if (isWeaponInCategory(weaponName, ARMES_COURANTES)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes courantes',
          category: 'Armes courantes'
        };
      }
    }
    
    // Armes de guerre (général)
    if (proficiency.includes('armes de guerre') && !proficiency.includes('propriété')) {
      if (isWeaponInCategory(weaponName, ARMES_DE_GUERRE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre',
          category: 'Armes de guerre'
        };
      }
    }
    
    // Armes de guerre avec propriété Finesse ou Légère
    if (proficiency.includes('finesse ou légère') || 
        proficiency.includes('finesse') && proficiency.includes('légère')) {
      if (isWeaponInCategory(weaponName, ARMES_GUERRE_FINESSE_OU_LEGERE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre avec propriété Finesse ou Légère',
          category: 'Armes de guerre (Finesse ou Légère)'
        };
      }
    }
    
    // Armes de guerre dotées de la propriété Légère
    if (proficiency.includes('dotées de la propriété légère') ||
        (proficiency.includes('légère') && !proficiency.includes('finesse'))) {
      if (isWeaponInCategory(weaponName, ARMES_GUERRE_LEGERE)) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre dotées de la propriété Légère',
          category: 'Armes de guerre (Légère)'
        };
      }
    }
  }

  // Si aucune maîtrise trouvée
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
    category
  };
}

// Fonction pour extraire les maîtrises d'armes du joueur
export function getPlayerWeaponProficiencies(player: any): string[] {
  const proficiencies: string[] = [];
  
  // Depuis les stats du créateur de personnage
  if (player.stats?.creator_meta?.weapon_proficiencies) {
    proficiencies.push(...player.stats.creator_meta.weapon_proficiencies);
  }
  
  // Depuis les stats générales
  if (player.stats?.weapon_proficiencies) {
    proficiencies.push(...player.stats.weapon_proficiencies);
  }
  
  // Maîtrises de classe par défaut (à adapter selon vos données de classe)
  const classWeaponProficiencies: { [key: string]: string[] } = {
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
  
  if (player.class && classWeaponProficiencies[player.class]) {
    proficiencies.push(...classWeaponProficiencies[player.class]);
  }
  
  return [...new Set(proficiencies)]; // Supprimer les doublons
}