/* ============================================================
 * Gestion & vérification des maîtrises d'armes
 * ============================================================ */

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

const WEAPON_NAME_VARIANTS: Record<string, string[]> = {
  'Bâton de combat': ['Baton de combat', 'Bâton', 'Baton', 'Baton combat', 'Bâton combat', 'Baton de marche', 'Bâton de marche'],
  'Dague': ['Dague', 'Poignard'],
  'Gourdin': ['Gourdin', 'Gourdin massif'],
  'Hachette': ['Hachette', 'Hache de jet', 'Petite hache'],
  'Javeline': ['Javeline', 'Javelot'],
  'Lance': ['Lance'],
  'Marteau léger': ['Marteau leger', 'Petit marteau', 'Marteau léger'],
  'Masse d\'armes': ['Masse', 'Masse d\'armes', 'Masse darmes', 'Masse darme'],
  'Massue': ['Massue'],
  'Serpe': ['Serpe', 'Faucille'],
  'Arbalète légère': ['Arbalete legere', 'Arbalète légère'],
  'Arc court': ['Arc court', 'Petit arc', 'Arc (court)'],
  'Fléchette': ['Flechette', 'Dart', 'Fléchette'],
  'Fronde': ['Fronde', 'Lance-pierre'],

  'Cimeterre': ['Cimeterre', 'Cimitarre', 'Cimetere'],
  'Coutille': ['Coutille', 'Guisarme', 'Guisarme-coutille'],
  'Épée à deux mains': ['Epee a deux mains', 'Épée a deux mains', 'Grande épée', 'Greatsword', 'Epée 2 mains', 'Epee 2 mains'],
  'Épée courte': ['Epee courte', 'Shortsword', 'Epée courte'],
  'Épée longue': ['Epee longue', 'Longsword', 'Epée longue'],
  'Fléau d\'armes': ['Fléau', 'Fleau', 'Fleau darmes', 'Flail'],
  'Fouet': ['Fouet', 'Whip'],
  'Hache à deux mains': ['Hache a deux mains', 'Grande hache', 'Greataxe', 'Hache 2 mains'],
  'Hache d\'armes': ['Hache d armes', 'Hache darme', 'Battleaxe', 'Hache de bataille'],
  'Hallebarde': ['Hallebarde', 'Halberd', 'Hallebarbe'],
  'Lance d\'arçon': ['Lance darcon', 'Lance d arcon', 'Lance de cavalerie', 'Lance de chevalier'],
  'Maillet d\'armes': ['Maillet d armes', 'Maillet', 'Maul', 'Marteau a deux mains'],
  'Marteau de guerre': ['Marteau de guerre', 'Warhammer'],
  'Morgenstern': ['Morgenstern', 'Morningstar', 'Morning star'],
  'Pic de guerre': ['Pic de guerre', 'War pick', 'Pic'],
  'Pique': ['Pique', 'Pike'],
  'Rapière': ['Rapière', 'Rapiere', 'Rapier'],
  'Trident': ['Trident'],
  'Arbalète de poing': ['Arbalete de poing', 'Hand crossbow'],
  'Arbalète lourde': ['Arbalete lourde', 'Heavy crossbow'],
  'Arc long': ['Arc long', 'Longbow'],
  'Mousquet': ['Mousquet', 'Musket'],
  'Pistolet': ['Pistolet', 'Pistol'],
  'Sarbacane': ['Sarbacane', 'Blowgun']
};

/* ---------------- Normalisation ---------------- */
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’`]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function simplifyWeaponInput(name: string): string {
  return normalize(
    name
      .replace(/\b(en )?argent(e|ee)?\b/gi, '')
      .replace(/\bmagique(s)?\b/gi, '')
      .replace(/\b(\+?1|plus un)\b/gi, '')
  );
}

interface CanonEntry { canonical: string; norm: string; }
const CANON_INDEX: CanonEntry[] = [];

(function buildIndex() {
  const seen = new Set<string>();
  const all = [...ARMES_COURANTES, ...ARMES_DE_GUERRE];
  for (const base of all) {
    const n = normalize(base);
    if (!seen.has(n)) { CANON_INDEX.push({ canonical: base, norm: n }); seen.add(n); }
    for (const variant of (WEAPON_NAME_VARIANTS[base] || [])) {
      const vn = normalize(variant);
      if (!seen.has(vn)) { CANON_INDEX.push({ canonical: base, norm: vn }); seen.add(vn); }
    }
  }
})();

function resolveCanonicalWeapon(input: string): string | null {
  const simp = simplifyWeaponInput(input);
  if (!simp) return null;
  const direct = CANON_INDEX.find(e => e.norm === simp);
  if (direct) return direct.canonical;
  const parts = simp.split(' ');
  if (parts.length > 1) {
    for (const p of parts) {
      const partMatch = CANON_INDEX.find(e => e.norm === p);
      if (partMatch) return partMatch.canonical;
    }
  }
  const starts = CANON_INDEX.find(e => simp.startsWith(e.norm));
  return starts ? starts.canonical : null;
}

function weaponIn(list: string[], weaponName: string): boolean {
  const canon = resolveCanonicalWeapon(weaponName);
  if (!canon) return false;
  return list.some(w => normalize(w) === normalize(canon));
}

function detectCategory(weaponName: string): string {
  if (weaponIn(ARMES_COURANTES, weaponName)) return 'Armes courantes';
  if (weaponIn(ARMES_GUERRE_FINESSE_OU_LEGERE, weaponName)) return 'Armes de guerre (Finesse ou Légère)';
  if (weaponIn(ARMES_GUERRE_LEGERE, weaponName)) return 'Armes de guerre (Légère)';
  if (weaponIn(ARMES_DE_GUERRE, weaponName)) return 'Armes de guerre';
  return 'Inconnue';
}

/* ---------------- Synonymes catégories ---------------- */
const SIMPLE_CATEGORY_SYNONYMS = [
  'armes courantes','arme courante','armes simples','arme simple','simple weapons','simple weapon'
].map(normalize);
const MARTIAL_CATEGORY_SYNONYMS = [
  'armes de guerre','arme de guerre','armes martiales','arme martiale','martial weapons','martial weapon'
].map(normalize);
const MARTIAL_SUB_FINESSE_LIGHT = [
  'armes de guerre presentant la propriete finesse ou legere',
  'armes de guerre finesse ou legere',
  'armes de guerre avec finesse ou legere',
  'armes de guerre finesse legere'
].map(normalize);
const MARTIAL_SUB_LIGHT_ONLY = [
  'armes de guerre dotees de la propriete legere',
  'armes de guerre legere',
  'armes de guerre legeres'
].map(normalize);

/* ---------------- Résultat ---------------- */
export interface WeaponProficiencyCheck {
  isProficient: boolean;
  reason: string;
  category?: string;
  shouldApplyProficiencyBonus: boolean;
  proficiencySource?: string;
  debug?: {
    input: string;
    simplified: string;
    canonical?: string | null;
    weaponCategory?: string;
    matchedBy?: 'category' | 'specificName' | 'subCategory';
    normalizedProficiencies: string[];
  };
}

/* ---------------- Vérification principale ---------------- */
export function checkWeaponProficiency(
  weaponName: string,
  playerProficiencies: string[],
  explicitCategory?: string
): WeaponProficiencyCheck {
  if (!weaponName?.trim()) {
    return {
      isProficient: false,
      reason: 'Nom d\'arme manquant',
      shouldApplyProficiencyBonus: false,
      debug: {
        input: weaponName,
        simplified: '',
        canonical: null,
        weaponCategory: 'Inconnue',
        normalizedProficiencies: playerProficiencies.map(normalize)
      }
    };
  }

  const simplified = simplifyWeaponInput(weaponName);
  const canonical = resolveCanonicalWeapon(weaponName);
  const normProfs = playerProficiencies.map(normalize);

  // Si une catégorie explicite est fournie (arme personnalisée), l'utiliser
  const weaponCategory = explicitCategory || detectCategory(weaponName);

  // Spécifique (uniquement pour les armes connues, pas pour les armes personnalisées)
  if (canonical && !explicitCategory) {
    const exact = normProfs.find(p => p === normalize(canonical));
    if (exact) {
      return {
        isProficient: true,
        reason: `Maîtrise spécifique de ${canonical}`,
        category: weaponCategory,
        shouldApplyProficiencyBonus: true,
        proficiencySource: exact,
        debug: { input: weaponName, simplified, canonical, weaponCategory, matchedBy: 'specificName', normalizedProficiencies: normProfs }
      };
    }
  }

  // Catégorie : Armes courantes
  if (weaponCategory === 'Armes courantes') {
    const hasSimple = normProfs.some(p => SIMPLE_CATEGORY_SYNONYMS.includes(p) || (p.includes('arme') && (p.includes('courant') || p.includes('simple'))));
    if (hasSimple) {
      return {
        isProficient: true,
        reason: 'Maîtrise des armes courantes',
        category: weaponCategory,
        shouldApplyProficiencyBonus: true,
        proficiencySource: 'Catégorie Armes courantes',
        debug: { input: weaponName, simplified, canonical, weaponCategory, matchedBy: 'category', normalizedProficiencies: normProfs }
      };
    }
  }

  // Catégorie : Armes de guerre (toutes)
  if (weaponCategory.startsWith('Armes de guerre')) {
    const hasMartial = normProfs.some(p => MARTIAL_CATEGORY_SYNONYMS.includes(p) || (p.includes('arme') && (p.includes('guerre') || p.includes('martial'))));
    if (hasMartial) {
      return {
        isProficient: true,
        reason: 'Maîtrise des armes de guerre',
        category: weaponCategory,
        shouldApplyProficiencyBonus: true,
        proficiencySource: 'Catégorie Armes de guerre',
        debug: { input: weaponName, simplified, canonical, weaponCategory, matchedBy: 'category', normalizedProficiencies: normProfs }
      };
    }

    if (weaponCategory === 'Armes de guerre (Finesse ou Légère)') {
      const hasSub = normProfs.some(p => MARTIAL_SUB_FINESSE_LIGHT.includes(p) || (p.includes('finesse') && p.includes('legere')));
      if (hasSub) {
        return {
          isProficient: true,
          reason: 'Maîtrise armes de guerre (Finesse ou Légère)',
          category: weaponCategory,
          shouldApplyProficiencyBonus: true,
          proficiencySource: 'Sous-catégorie Finesse/Légère',
          debug: { input: weaponName, simplified, canonical, weaponCategory, matchedBy: 'subCategory', normalizedProficiencies: normProfs }
        };
      }
    }

    if (weaponCategory === 'Armes de guerre (Légère)') {
      const hasLight = normProfs.some(p => MARTIAL_SUB_LIGHT_ONLY.includes(p) || (p.includes('legere') && !p.includes('finesse')));
      if (hasLight) {
        return {
          isProficient: true,
          reason: 'Maîtrise armes de guerre (Légère)',
          category: weaponCategory,
          shouldApplyProficiencyBonus: true,
          proficiencySource: 'Sous-catégorie Légère',
            debug: { input: weaponName, simplified, canonical, weaponCategory, matchedBy: 'subCategory', normalizedProficiencies: normProfs }
        };
      }
    }
  }

  return {
    isProficient: false,
    reason: `Aucune maîtrise pour cette arme (${weaponCategory})`,
    category: weaponCategory,
    shouldApplyProficiencyBonus: false,
    debug: { input: weaponName, simplified, canonical, weaponCategory, normalizedProficiencies: normProfs }
  };
}

/* ---------------- Maîtrises par classe ---------------- */
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

/* ---------------- Extraction maîtrises joueur ---------------- */
function collectFrom(obj: any, path: string[]): any {
  return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function getPlayerWeaponProficiencies(player: any): string[] {
  const out: string[] = [];
  const pushArr = (arr: any) => {
    if (Array.isArray(arr)) {
      for (const v of arr) {
        if (typeof v === 'string' && v.trim()) out.push(v.trim());
      }
    }
  };

  // Chemins explicites
  const explicitPaths = [
    ['stats','creator_meta','weapon_proficiencies'],
    ['stats','creator_meta','weaponProficiencies'],
    ['stats','weapon_proficiencies'],
    ['stats','weaponProficiencies'],
    ['weapon_proficiencies'],
    ['weaponProficiencies'],
    ['proficiencies','weapons'], // structure type { proficiencies: { weapons: [...] } }
    ['proficiencies','weapon'],
    ['proficiencies'] // si c'est directement un tableau
  ];

  for (const p of explicitPaths) {
    const val = collectFrom(player, p);
    pushArr(val);
  }

  // Si player.proficiencies est un objet avec diverses clés contenant des listes
  if (player?.proficiencies && !Array.isArray(player.proficiencies) && typeof player.proficiencies === 'object') {
    for (const k of Object.keys(player.proficiencies)) {
      const lower = k.toLowerCase();
      if (lower.includes('weapon') || lower.includes('arme')) {
        pushArr(player.proficiencies[k]);
      }
    }
  }

  // Heuristique : parcourir les clés racines pour tableaux nommés avec 'weapon' ou 'arme'
  for (const k of Object.keys(player || {})) {
    if (Array.isArray(player[k]) && (k.toLowerCase().includes('weapon') || k.toLowerCase().includes('arme'))) {
      pushArr(player[k]);
    }
  }

  // Ajouter maîtrises de classe par défaut
  if (player?.class && CLASS_WEAPON_PROFICIENCIES[player.class]) {
    pushArr(CLASS_WEAPON_PROFICIENCIES[player.class]);
  }

  // Unicité
  const unique = [...new Set(out)].filter(Boolean);

  // Debug optionnel
  // Active en console: window.__LOG_WEAPON_PROF__ = true;
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.__LOG_WEAPON_PROF__) {
      // @ts-ignore
      console.log('[getPlayerWeaponProficiencies] RESULT:', unique);
    }
  } catch {}

  return unique;
}

/* ---------------- Outils publics ---------------- */
export function getWeaponsByCategory() {
  return {
    courantes: ARMES_COURANTES,
    guerre: ARMES_DE_GUERRE,
    guerreFinesseLegere: ARMES_GUERRE_FINESSE_OU_LEGERE,
    guerreLegere: ARMES_GUERRE_LEGERE
  };
}

export function isValidWeapon(weaponName: string): boolean {
  return !!resolveCanonicalWeapon(weaponName);
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

/* ---------------- Debug ---------------- */
export function debugWeaponProficiency(weaponName: string, playerProficiencies: string[]): void {
  console.group(`🗡️ Debug maîtrise: ${weaponName}`);
  console.log('Maîtrises joueur (brut):', playerProficiencies);
  console.log('Maîtrises normalisées:', playerProficiencies.map(normalize));
  console.log('Simplifié:', simplifyWeaponInput(weaponName));
  console.log('Canonique:', resolveCanonicalWeapon(weaponName));
  console.log('Catégorie détectée:', getWeaponCategory(weaponName));
  console.log('Arme valide ?', isValidWeapon(weaponName));
  const result = checkWeaponProficiency(weaponName, playerProficiencies);
  console.log('Résultat final:', result);
  console.groupEnd();
}