/* ============================================================
 * Gestion & vérification des maîtrises d'armes
 * - Supporte variantes orthographiques / accents / apostrophes
 * - Supporte catégories générales + sous-catégories
 * - Fournit un objet de debug pour faciliter l'inspection
 *
 * Exporte (interfaces & fonctions utilisées ailleurs) :
 *  - interface WeaponProficiencyCheck
 *  - checkWeaponProficiency(weaponName, playerProficiencies)
 *  - getPlayerWeaponProficiencies(player)
 *  - getWeaponsByCategory()
 *  - isValidWeapon(weaponName)
 *  - getWeaponCategory(weaponName)
 *  - getAllAvailableProficiencies()
 *  - debugWeaponProficiency(weaponName, playerProficiencies)
 * ============================================================ */

/* ===================== LISTES SOURCE ===================== */
// Armes courantes
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

// Armes de guerre (complètes)
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

// Sous-ensembles particuliers
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

/* ===================== VARIANTES & SYNONYMES ===================== */
/**
 * Variantes orthographiques / synonymes d'armes.
 * La clé est la forme canonique (une des listes ci-dessus).
 * Ajouter ici toutes les écritures rencontrées dans la DB ou imports.
 */
const WEAPON_NAME_VARIANTS: Record<string, string[]> = {
  'Bâton de combat': ['Baton de combat', 'Baton', 'Bâton', 'Baton (combat)', 'Bâton (combat)', 'Baton de marche', 'Bâton de marche', 'Baton combat'],
  'Dague': ['Dague', 'Poignard', 'Dague simple', 'Dague (argent)', 'Dague en argent', 'Dague en argentée', 'Dague argentée'],
  'Gourdin': ['Gourdin', 'Gourdin lourd'],
  'Hachette': ['Hachette', 'Hache de jet', 'Petite hache', 'Petite hachette'],
  'Javeline': ['Javeline', 'Javelot'],
  'Lance': ['Lance', 'Lance simple'],
  'Marteau léger': ['Marteau leger', 'Petit marteau', 'Marteau léger', 'Marteau court', 'Marteau', 'Marteau (léger)'],
  'Masse d\'armes': ['Masse d\'armes', 'Masse', 'Masse darmes', 'Masse arme', 'Masse d arme', 'Masse darme'],
  'Massue': ['Massue', 'Gourdin massif'],
  'Serpe': ['Serpe', 'Faucille'],
  'Arbalète légère': ['Arbalète légère', 'Arbalete legere', 'Arbalete legere (light)', 'Arbalète legere'],
  'Arc court': ['Arc court', 'Arc (court)', 'Petit arc', 'Arc leger'],
  'Fléchette': ['Fléchette', 'Flechette', 'Dart', 'Fléchettes'],
  'Fronde': ['Fronde', 'Lance-pierre'],

  'Cimeterre': ['Cimeterre', 'Cimitarre', 'Cimitar', 'Cimetere'],
  'Coutille': ['Coutille', 'Guisarme', 'Guisarme-coutille'],
  'Épée à deux mains': ['Epée à deux mains', 'Epee a deux mains', 'Épée a deux mains', 'Grande épée', 'Grande epee', 'Greatsword', 'Epée 2 mains', 'Epee 2 mains'],
  'Épée courte': ['Epée courte', 'Epee courte', 'Shortsword', 'Epee courte (shortsword)', 'Epée courte'],
  'Épée longue': ['Epée longue', 'Epee longue', 'Longsword', 'Epee longue (longsword)'],
  'Fléau d\'armes': ['Fléau d\'armes', 'Fleau darmes', 'Fleau', 'Fléau', 'Fléau arme', 'Fléau a chaines', 'Fléau d arme', 'Flail'],
  'Fouet': ['Fouet', 'Whip'],
  'Hache à deux mains': ['Hache a deux mains', 'Grande hache', 'Greataxe', 'Hache 2 mains', 'Hache lourde'],
  'Hache d\'armes': ['Hache d armes', 'Hache darme', 'Battleaxe', 'Hache', 'Hache de bataille'],
  'Hallebarde': ['Hallebarde', 'Halberd', 'Hallebarbe', 'Halebarde'],
  'Lance d\'arçon': ['Lance d arçon', 'Lance darcon', 'Lance d arcon', 'Lance de cavalerie', 'Lance de chevalier', 'Lance lourde'],
  'Maillet d\'armes': ['Maillet d armes', 'Maillet', 'Marteau lourd', 'Marteau a deux mains', 'Maul', 'Maillet darme'],
  'Marteau de guerre': ['Marteau de guerre', 'Warhammer', 'Marteau lourd (warhammer)'],
  'Morgenstern': ['Morgenstern', 'Morningstar', 'Morning star', 'Étoile du matin', 'Etoile du matin'],
  'Pic de guerre': ['Pic de guerre', 'War pick', 'Pic de guerre (war pick)', 'Pic'],
  'Pique': ['Pique', 'Pike'],
  'Rapière': ['Rapière', 'Rapiere', 'Rapier'],
  'Trident': ['Trident'],
  'Arbalète de poing': ['Arbalète de poing', 'Arbalete de poing', 'Hand crossbow'],
  'Arbalète lourde': ['Arbalète lourde', 'Arbalete lourde', 'Heavy crossbow'],
  'Arc long': ['Arc long', 'Arc (long)', 'Longbow'],
  'Mousquet': ['Mousquet', 'Musket'],
  'Pistolet': ['Pistolet', 'Pistol'],
  'Sarbacane': ['Sarbacane', 'Blowgun']
};

/* =============== NORMALISATION =============== */
function normalizeText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')        // accents
    .toLowerCase()
    .replace(/['’`]/g, ' ')                // apostrophes → espace
    .replace(/\([^)]*\)/g, ' ')            // enlever parenthèses et contenu
    .replace(/[^a-z0-9]+/g, ' ')           // tout sauf alphanum → espace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simplifie un nom d'arme utilisateur pour matcher le canon :
 * - Normalise
 * - Retire certains qualificatifs fréquents (en argent, argent, magique...)
 */
function simplifyWeaponInput(name: string): string {
  let n = normalizeText(name);
  n = n
    .replace(/\b(en )?argent(e|ee)?\b/g, '')
    .replace(/\bmagique(s)?\b/g, '')
    .replace(/\bplus un\b/g, '')
    .replace(/\b\+?1\b/g, '')
    .replace(/\bde? ?combat\b/g, '') // "bâton de combat" -> garde "baton", on recollera via variantes
    .trim()
    .replace(/\s+/g, ' ');
  return n;
}

/* =============== INDEX DE RECHERCHE CANONIQUE =============== */
interface CanonEntry {
  canonical: string;
  norm: string;
}

const ALL_CANONICAL_WEAPONS: string[] = [
  ...ARMES_COURANTES,
  ...ARMES_DE_GUERRE
];

const CANON_INDEX: CanonEntry[] = [];

(function buildCanonIndex() {
  const added = new Set<string>();
  for (const w of ALL_CANONICAL_WEAPONS) {
    const canonNorm = normalizeText(w);
    if (!added.has(canonNorm)) {
      CANON_INDEX.push({ canonical: w, norm: canonNorm });
      added.add(canonNorm);
    }
    const variants = WEAPON_NAME_VARIANTS[w] || [];
    for (const v of variants) {
      const vn = normalizeText(v);
      if (!added.has(vn)) {
        CANON_INDEX.push({ canonical: w, norm: vn });
        added.add(vn);
      }
    }
  }
})();

/**
 * Essaie de retrouver la forme canonique d'un nom d'arme utilisateur.
 */
function resolveCanonicalWeapon(userWeaponName: string): string | null {
  if (!userWeaponName) return null;
  const simplified = simplifyWeaponInput(userWeaponName);
  if (!simplified) return null;

  // 1. Match direct dans l'index (norm)
  const direct = CANON_INDEX.find(e => e.norm === simplified);
  if (direct) return direct.canonical;

  // 2. Essai : si mot composé, tenter chaque segment principal
  // (ex: "dague argentée" simplifié -> "dague", déjà couvert, mais au cas où)
  const parts = simplified.split(' ');
  if (parts.length > 1) {
    for (const part of parts) {
      const candidate = CANON_INDEX.find(e => e.norm === part);
      if (candidate) return candidate.canonical;
    }
  }

  // 3. Dernier recours : recherche qui "commence par"
  const starts = CANON_INDEX.find(e => simplified.startsWith(e.norm));
  if (starts) return starts.canonical;

  return null;
}

/* ===================== INTERFACE RESULTAT ===================== */
export interface WeaponProficiencyCheck {
  isProficient: boolean;
  reason: string;
  category?: string;
  shouldApplyProficiencyBonus: boolean;
  proficiencySource?: string;
  // Champs de debug supplémentaires
  debug?: {
    input: string;
    simplified: string;
    canonical?: string | null;
    weaponCategory?: string;
    matchedBy?: 'category' | 'specificName' | 'subCategory';
    normalizedProficiencies: string[];
  };
}

/* ===================== CATÉGORISATION ===================== */
function weaponInList(weaponName: string, list: string[]): boolean {
  const canonical = resolveCanonicalWeapon(weaponName);
  if (!canonical) return false;
  return list.some(w => normalizeText(w) === normalizeText(canonical));
}

function detectCategory(weaponName: string): string {
  if (weaponInList(weaponName, ARMES_COURANTES)) return 'Armes courantes';
  if (weaponInList(weaponName, ARMES_GUERRE_FINESSE_OU_LEGERE)) return 'Armes de guerre (Finesse ou Légère)';
  if (weaponInList(weaponName, ARMES_GUERRE_LEGERE)) return 'Armes de guerre (Légère)';
  if (weaponInList(weaponName, ARMES_DE_GUERRE)) return 'Armes de guerre';
  return 'Inconnue';
}

/* ===================== PROFICIENCIES CATEGORIES SYNO ===================== */
const SIMPLE_CATEGORY_SYNONYMS = [
  'armes courantes', 'arme courante',
  'armes simples', 'arme simple',
  'simple weapons', 'simple weapon'
].map(normalizeText);

const MARTIAL_CATEGORY_SYNONYMS = [
  'armes de guerre', 'arme de guerre',
  'armes martiales', 'arme martiale',
  'martial weapons', 'martial weapon'
].map(normalizeText);

const MARTIAL_SUB_FINESSE_LIGHT_SYNONYMS = [
  'armes de guerre presentant la propriete finesse ou legere',
  'armes de guerre finesse ou legere',
  'armes de guerre avec finesse ou legere',
  'armes de guerre finesse legere',
  'armes de guerre finesse',
  'armes de guerre legere finesse'
].map(normalizeText);

const MARTIAL_SUB_LIGHT_ONLY_SYNONYMS = [
  'armes de guerre dotees de la propriete legere',
  'armes de guerre legere',
  'armes de guerre legeres',
  'armes de guerre propriete legere'
].map(normalizeText);

/* ===================== PRINCIPALE : checkWeaponProficiency ===================== */
export function checkWeaponProficiency(
  weaponName: string,
  playerProficiencies: string[]
): WeaponProficiencyCheck {

  if (!weaponName || !weaponName.trim()) {
    return {
      isProficient: false,
      reason: 'Nom d\'arme manquant',
      shouldApplyProficiencyBonus: false,
      debug: {
        input: weaponName,
        simplified: '',
        canonical: null,
        weaponCategory: 'Inconnue',
        matchedBy: undefined,
        normalizedProficiencies: playerProficiencies.map(p => normalizeText(p))
      }
    };
  }

  const simplified = simplifyWeaponInput(weaponName);
  const canonical = resolveCanonicalWeapon(weaponName);
  const normalizedProfs = playerProficiencies.map(p => normalizeText(p));
  const weaponCategory = detectCategory(weaponName);

  // 1. Maîtrise spécifique exacte (le joueur aurait listé "Dague" par ex.)
  if (canonical) {
    const directSpecific = normalizedProfs.find(p => p === normalizeText(canonical));
    if (directSpecific) {
      return {
        isProficient: true,
        reason: `Maîtrise spécifique de ${canonical}`,
        category: weaponCategory,
        shouldApplyProficiencyBonus: true,
        proficiencySource: directSpecific,
        debug: {
          input: weaponName,
          simplified,
          canonical,
            weaponCategory,
          matchedBy: 'specificName',
          normalizedProficiencies: normalizedProfs
        }
      };
    }
  }

  // 2. Catégorie générale : Armes courantes
  if (weaponCategory === 'Armes courantes') {
    const hasSimple = normalizedProfs.some(p =>
      SIMPLE_CATEGORY_SYNONYMS.includes(p) ||
      (p.includes('arme') && (p.includes('courante') || p.includes('simple')))
    );
    if (hasSimple) {
      return {
        isProficient: true,
        reason: 'Maîtrise des armes courantes',
        category: 'Armes courantes',
        shouldApplyProficiencyBonus: true,
        proficiencySource: 'Catégorie Armes courantes',
        debug: {
          input: weaponName,
          simplified,
          canonical,
          weaponCategory,
          matchedBy: 'category',
          normalizedProficiencies: normalizedProfs
        }
      };
    }
  }

  // 3. Catégorie générale : Armes de guerre
  if (weaponCategory.startsWith('Armes de guerre')) {
    const hasMartial = normalizedProfs.some(p =>
      MARTIAL_CATEGORY_SYNONYMS.includes(p) ||
      (p.includes('arme') && (p.includes('guerre') || p.includes('martial')))
    );
    if (hasMartial) {
      return {
        isProficient: true,
        reason: 'Maîtrise des armes de guerre',
        category: weaponCategory,
        shouldApplyProficiencyBonus: true,
        proficiencySource: 'Catégorie Armes de guerre',
        debug: {
          input: weaponName,
          simplified,
          canonical,
          weaponCategory,
          matchedBy: 'category',
          normalizedProficiencies: normalizedProfs
        }
      };
    }

    // 3.b Sous-catégorie finesse ou légère
    if (weaponCategory === 'Armes de guerre (Finesse ou Légère)') {
      const hasSub = normalizedProfs.some(p => MARTIAL_SUB_FINESSE_LIGHT_SYNONYMS.includes(p) ||
        (p.includes('finesse') && p.includes('legere')));
      if (hasSub) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre (Finesse ou Légère)',
          category: weaponCategory,
          shouldApplyProficiencyBonus: true,
          proficiencySource: 'Sous-catégorie Finesse ou Légère',
          debug: {
            input: weaponName,
            simplified,
            canonical,
            weaponCategory,
            matchedBy: 'subCategory',
            normalizedProficiencies: normalizedProfs
          }
        };
      }
    }

    // 3.c Sous-catégorie légère
    if (weaponCategory === 'Armes de guerre (Légère)') {
      const hasLight = normalizedProfs.some(p =>
        MARTIAL_SUB_LIGHT_ONLY_SYNONYMS.includes(p) ||
        (p.includes('legere') && !p.includes('finesse'))
      );
      if (hasLight) {
        return {
          isProficient: true,
          reason: 'Maîtrise des armes de guerre (Légère)',
          category: weaponCategory,
          shouldApplyProficiencyBonus: true,
          proficiencySource: 'Sous-catégorie Légère',
          debug: {
            input: weaponName,
            simplified,
            canonical,
            weaponCategory,
            matchedBy: 'subCategory',
            normalizedProficiencies: normalizedProfs
          }
        };
      }
    }
  }

  // 4. Aucune maîtrise
  return {
    isProficient: false,
    reason: `Aucune maîtrise pour cette arme (${weaponCategory})`,
    category: weaponCategory,
    shouldApplyProficiencyBonus: false,
    debug: {
      input: weaponName,
      simplified,
      canonical,
      weaponCategory,
      matchedBy: undefined,
      normalizedProficiencies: normalizedProfs
    }
  };
}

/* ===================== PROFICIENCIES PAR CLASSE ===================== */
const CLASS_WEAPON_PROFICIENCIES: Record<string, string[]> = {
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

/* ===================== EXTRACTION DES MAÎTRISES JOUEUR ===================== */
export function getPlayerWeaponProficiencies(player: any): string[] {
  const profs: string[] = [];

  try {
    // 1. Creator meta
    if (player?.stats?.creator_meta?.weapon_proficiencies) {
      const arr = player.stats.creator_meta.weapon_proficiencies;
      if (Array.isArray(arr)) profs.push(...arr);
    }
    // 2. Stats direct
    if (player?.stats?.weapon_proficiencies) {
      const arr = player.stats.weapon_proficiencies;
      if (Array.isArray(arr)) profs.push(...arr);
    }
    // 3. Classe
    if (player?.class && CLASS_WEAPON_PROFICIENCIES[player.class]) {
      profs.push(...CLASS_WEAPON_PROFICIENCIES[player.class]);
    }

    // 4. Nettoyage + unicité
    const unique = [...new Set(profs)]
      .filter(p => p && typeof p === 'string' && p.trim().length > 0);

    return unique;
  } catch (e) {
    console.error('[WeaponProficiency] Erreur extraction maîtrises:', e);
    if (player?.class && CLASS_WEAPON_PROFICIENCIES[player.class]) {
      return CLASS_WEAPON_PROFICIENCIES[player.class];
    }
    return [];
  }
}

/* ===================== OUTILS PUBLICS ===================== */
export function getWeaponsByCategory() {
  return {
    courantes: ARMES_COURANTES,
    guerre: ARMES_DE_GUERRE,
    guerreFinesseLegere: ARMES_GUERRE_FINESSE_OU_LEGERE,
    guerreLegere: ARMES_GUERRE_LEGERE
  };
}

export function isValidWeapon(weaponName: string): boolean {
  if (!weaponName || !weaponName.trim()) return false;
  return resolveCanonicalWeapon(weaponName) !== null;
}

export function getWeaponCategory(weaponName: string): string {
  return detectCategory(weaponName);
}

export function getAllAvailableProficiencies(): string[] {
  return [
    'Armes courantes',
    'Armes de guerre',
    'Armes de guerre présentant la propriété Finesse ou Légère',
    'Armes de guerre dotées de la propriété Légère'
  ];
}

/* ===================== DEBUG ===================== */
export function debugWeaponProficiency(weaponName: string, playerProficiencies: string[]): void {
  console.group(`🗡️ Debug maîtrise: ${weaponName}`);
  console.log('Maîtrises joueur (brut):', playerProficiencies);
  console.log('Maîtrises joueur (normalisées):', playerProficiencies.map(p => normalizeText(p)));
  console.log('Simplifié:', simplifyWeaponInput(weaponName));
  console.log('Canonique:', resolveCanonicalWeapon(weaponName));
  console.log('Catégorie détectée:', getWeaponCategory(weaponName));
  console.log('Arme valide ?', isValidWeapon(weaponName));
  const result = checkWeaponProficiency(weaponName, playerProficiencies);
  console.log('Résultat final:', result);
  console.groupEnd();
}

/* ===================== EXPORT SUPPLÉMENTAIRE (OPTIONNEL) ===================== */
/**
 * Permet d'ajouter dynamiquement de nouvelles variantes à chaud si besoin
 * (ex: depuis une interface d'admin). Non utilisé directement mais utile.
 */
export function registerWeaponVariant(canonical: string, variant: string) {
  if (!WEAPON_NAME_VARIANTS[canonical]) {
    WEAPON_NAME_VARIANTS[canonical] = [];
  }
  WEAPON_NAME_VARIANTS[canonical].push(variant);
  // Rebuild minimal index entry
  const normVar = normalizeText(variant);
  const normCanon = normalizeText(canonical);
  const already = CANON_INDEX.find(e => e.norm === normVar);
  if (!already) {
    CANON_INDEX.push({ canonical, norm: normVar });
  }
  // S'assurer que canon est présent aussi (devrait déjà l'être)
  if (!CANON_INDEX.find(e => e.norm === normCanon)) {
    CANON_INDEX.push({ canonical, norm: normCanon });
  }
}