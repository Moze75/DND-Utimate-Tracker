/* ===========================================================
   Types externes
   =========================================================== */

export type AbilitySection = {
  level: number;
  title: string;
  content: string;
  origin: 'class' | 'subclass';
};

export type PlayerLike = {
  id?: string | null;
  class?: string | null;
  subclass?: string | null;
  level?: number | null;
  class_resources?: any | null;
  // champs optionnels utiles pour extraire le modificateur de Charisme
  stats?: { charisma?: number; CHA?: number } | null;
  charisma?: number;
  CHA?: number;
  ability_scores?: { cha?: number } | null;
  abilities?: any; // objet ou tableau selon les modèles
};

/* ===========================================================
   Aides noms / alias (aligné "règles 2024"
   =========================================================== */

export const CLASS_ALIASES: Record<string, string[]> = {
  barbare: ['Barbare', 'Barbarian'],
  barde: ['Barde', 'Bard'],
  clerc: ['Clerc', 'Cleric', 'Prêtre', 'Pretre'],
  druide: ['Druide', 'Druid'],
  ensorceleur: ['Ensorceleur', 'Sorcerer', 'Sorceror'],
  guerrier: ['Guerrier', 'Fighter'],
  magicien: ['Magicien', 'Wizard', 'Mage'],
  moine: ['Moine', 'Monk'],
  paladin: ['Paladin'],
  rodeur: ['Rôdeur', 'Rodeur', 'Ranger'],
  roublard: ['Roublard', 'Voleur', 'Rogue', 'Thief'],
  // Nouveau: Occultiste = Warlock (VF moderne "Sorcier")
  occultiste: ['Occultiste', 'Warlock', 'Sorcier'],
};

// Clés normalisées (sans accents / tirets), valeurs: variantes FR/EN pour la recherche
export const SUBCLASS_ALIASES: Record<string, string[]> = {
  /* ============================
   * Barbare – 2024
   * ============================ */

  'voie de l arbre monde': ['Voie de l\'Arbre-Monde', 'Voie de l arbre-monde', 'Voie de l arbre monde', 'Path of the World Tree'],
  'voie du berserker': ['Voie du Berserker', 'Berserker', 'Path of the Berserker'],
  'voie du coeur sauvage': ['Voie du Cœur sauvage', 'Voie du Coeur sauvage', 'Path of the Wild Heart'],
  'voie du zelateur': ['Voie du Zélateur', 'Voie du Zelateur', 'Path of the Zealot'],

  /* ============================
   * Barde – 2024
   * ============================ */
  
  'college de la danse': ['Collège de la Danse', 'College de la Danse', 'College of Dance'],
  'college du savoir': ['Collège du Savoir', 'College du savoir', 'College of Lore', 'Lore'],
  'college de la seduction': ['Collège de la Séduction', 'College de la Seduction', 'College of Glamour', 'Glamour'],
  'college de la vaillance': ['Collège de la Vaillance', 'College de la Vaillance', 'College of Valor', 'Valor'],

  /* ============================
   * Clerc – 2024
   * ============================ */
  'domaine de la guerre': ['Domaine de la Guerre', 'War Domain'],
  'domaine de la lumiere': ['Domaine de la Lumière', 'Light Domain'],
  'domaine de la ruse': ['Domaine de la Ruse', 'Trickery Domain'],
  'domaine de la vie': ['Domaine de la Vie', 'Life Domain'],

  /* ============================
   * Druide – 2024
   * ============================ */
  'cercle des astres': ['Cercle des Astres', 'Circle of Stars', 'Stars'],
  'cercle de la lune': ['Cercle de la Lune', 'Circle of the Moon', 'Moon'],
  'cercle des mers': ['Cercle des Mers', 'Circle of the Sea', 'Sea'],
  'cercle de la terre': ['Cercle de la Terre', 'Circle of the Land', 'Land'],

  /* ============================
   * Ensorceleur – 2024
   * ============================ */
  'sorcellerie aberrante': ['Sorcellerie aberrante', 'Aberrant Sorcery', 'Aberrant Mind'],
  'sorcellerie draconique': ['Sorcellerie draconique'],
  'sorcellerie mecanique': ['Sorcellerie mécanique'],
  'sorcellerie sauvage': ['Sorcellerie sauvage'],

  /* ============================
   * Guerrier – 2024
   * ============================ */
  champion: ['Champion', 'Champion Fighter'],
  'chevalier occultiste': ['Chevalier occultiste', 'Eldritch Knight'],
  'maitre de guerre': ['Maître de guerre', 'Maitre de guerre', 'Battle Master', 'Battlemaster'],
  'soldat psi': ['Soldat psi', 'Psi Warrior', 'Psychic Warrior'],

  /* ============================
   * Magicien – 2024
   * ============================ */
  abjurateur: ['Abjurateur', 'Abjuration', 'School of Abjuration'],
  devin: ['Devin', 'Divination', 'School of Divination'],
  evocateur: ['Évocateur', 'Evocateur', 'School of Evocation'],
  illusionniste: ['Illusionniste', 'Illusion', 'School of Illusion'],

  /* ============================
   * Moine – 2024
   * ============================ */
  'credo des elements': ['Crédo des Éléments', 'Credo des Elements', 'Way of the Four Elements'],
  'credo de la misericorde': ['Crédo de la Miséricorde', 'Credo de la Misericorde', 'Way of Mercy'],
  'credo de l ombre': ['Crédo de l\'Ombre', 'Credo de l Ombre', 'Way of Shadow', 'Shadow'],
  'credo de la paume': ['Crédo de la Paume'],

  /* ============================
   * Occultiste (Warlock) – 2024
   * ============================ */
  'protecteur archifee': ['Protecteur Archifée', 'Archfey', 'The Archfey'],
  'protecteur celeste': ['Protecteur Céleste', 'Celeste', 'The Celestial', 'Celestial'],
  'protecteur fielon': ['Protecteur Fiélon', 'Protecteur Fielon', 'The Fiend', 'Fiend'],
  'protecteur grand ancien': ['Protecteur Grand Ancien', 'The Great Old One', 'Great Old One'],

  /* ============================
   * Paladin – 2024
   * ============================ */
  'serment de gloire': ['Serment de Gloire', 'Oath of Glory'],
  'serment des anciens': ['Serment des Anciens', 'Oath of the Ancients'],
  'serment de devotion': ['Serment de Dévotion', 'Serment de Devotion', 'Oath of Devotion'],
  'serment de vengeance': ['Serment de Vengeance', 'Oath of Vengeance'],

  /* ============================
   * Rôdeur – 2024
   * ============================ */
  belluaire: ['Belluaire', 'Beast Master', 'Beastmaster'],
  chasseur: ['Chasseur', 'Hunter'],
  'traqueur des tenebres': ['Traqueur des ténèbres', 'Traqueur des tenebres', 'Gloom Stalker'],
  'vagabond feerique': ['Vagabond féérique', 'Vagabond feerique', 'Fey Wanderer'],

  /* ============================
   * Roublard – 2024
   * ============================ */
  'ame aceree': ['Âme acérée', 'Ame aceree', 'Soulknife'],
  'arnaqueur arcanique': ['Arnaqueur arcanique', 'Arcane Trickster'],
  assassin: ['Assassin'],
  voleur: ['Voleur', 'Thief'],
};

/* ===========================================================
   Utils textes
   =========================================================== */

export function norm(s: string) {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function canonicalClass(name: string): string {
  const n = norm(name);

  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric', 'pretre', 'prêtre', 'pretres'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';

  // Ensorceleur = Sorcerer
  if (['ensorceleur', 'sorcerer', 'sorceror'].includes(n)) return 'Ensorceleur';

  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  // Magicien = Wizard (on accepte "mage")
  if (['magicien', 'wizard', 'mage'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue', 'thief'].includes(n)) return 'Roublard';

  // Occultiste = Warlock (et "Sorcier" en VF moderne)
  if (['occultiste', 'warlock', 'sorcier'].includes(n)) return 'Occultiste';

  return name || '';
}

export function sentenceCase(s: string) {
  const t = (s || '').toLocaleLowerCase('fr-FR').trim();
  if (!t) return t;
  const first = t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1);
  return first.replace(/\b([A-Z]{2,})\b/g, '$1');
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function stripParentheses(s: string) {
  return (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function slug(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ===========================================================
   Helper sous-classe robuste (plusieurs noms possibles)
   =========================================================== */
export function getSubclassFromPlayerLike(p?: any): string | null {
  if (!p) return null;
  const candidates = [p?.subclass, p?.sub_class, p?.subClass, p?.sousClasse, p?.['sous-classe']];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return found ? String(found).trim() : null;
}

/* ===========================================================
   Helper robuste: modificateur de Charisme
   =========================================================== */

export function getChaModFromPlayerLike(p?: any): number {
  if (!p) return 0;

  const toNum = (v: any): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^\d+-]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  let chaObj: any = null;
  const abilities = p?.abilities;
  if (Array.isArray(abilities)) {
    chaObj = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return n === 'charisme' || n === 'charisma' || n === 'cha' || n === 'car';
    });
  } else if (abilities && typeof abilities === 'object') {
    const keys = Object.keys(abilities);
    const key =
      keys.find(k => {
        const kk = k.toLowerCase();
        return kk === 'charisme' || kk === 'charisma' || kk === 'cha' || kk === 'car';
      }) ??
      keys.find(k => k.toLowerCase().includes('charis') || k.toLowerCase() === 'cha' || k.toLowerCase() === 'car');
    if (key) chaObj = abilities[key];
  }

  if (chaObj) {
    const mod = toNum(chaObj.modifier) ?? toNum(chaObj.mod) ?? toNum(chaObj.modValue) ?? toNum(chaObj.value);
    if (mod != null) return mod;
    const score = toNum(chaObj.score) ?? toNum(chaObj.total) ?? toNum(chaObj.base);
    if (score != null) return Math.floor((score - 10) / 2);
  }

  const score2 =
    p?.stats?.charisma ??
    p?.stats?.CHA ??
    p?.charisma ??
    p?.CHA ??
    p?.ability_scores?.cha ??
    p?.abilities?.cha ??
    null;

  if (typeof score2 === 'number') return Math.floor((score2 - 10) / 2);

  return 0;
} 