/* Centralisation des progressions de sorts / emplacements / préparation
   Adapté aux tableaux fournis : Magicien, Ensorceleur, Occultiste (Warlock)
   + progression standard full / half caster (PHB 5e)
*/

export type CasterType = 'full' | 'half' | 'pact' | 'none';

export interface PactSlotInfo {
  slots: number;
  slotLevel: number;
}

export interface ClassSpellProgression {
  keyVariants: string[];              // variantes textuelles reconnues
  casterType: CasterType;
  // Table des cantrips connus par niveau (index = niveau perso)
  cantripsKnown?: number[];
  // Table explicite du nombre de sorts préparés (si la classe utilise une table)
  preparedTable?: number[];
  // Formule alternative si la classe utilise (mod + niveau) ou autre
  preparedFormula?: (level: number, abilityMod: number) => number;
  // (Optionnel) spellsKnownTable si tu veux réintroduire un modèle "connus"
  spellsKnownTable?: number[];
  // Matrice des slots : index = niveau perso, value = map { niveau_de_sort: nb_slots }
  slotMatrix?: Array<Record<number, number>>;
  // Pour Warlock : pact slots séparés
  pactSlots?: PactSlotInfo[];
  // Niveaux d'Arcanum mystique (Warlock)
  mysticArcanumLevels?: number[];
  // Table Warlock/Sorcerer 2024 "Sorts préparés"
}

const makeEmptySlotMatrix = (): Array<Record<number, number>> => {
  const arr: Array<Record<number, number>> = new Array(21).fill(null).map(() => ({}));
  return arr;
};

/* -------------------------
   1. Full caster slot matrix
   Standard PHB (Wizard/Cleric/Druid/Bard/Sorcerer)
   Index = niveau personnage
-------------------------- */
const fullCasterSlots = makeEmptySlotMatrix();
// Niveau 1
fullCasterSlots[1] = { 1: 2 };
fullCasterSlots[2] = { 1: 3 };
fullCasterSlots[3] = { 1: 4, 2: 2 };
fullCasterSlots[4] = { 1: 4, 2: 3 };
fullCasterSlots[5] = { 1: 4, 2: 3, 3: 2 };
fullCasterSlots[6] = { 1: 4, 2: 3, 3: 3 };
fullCasterSlots[7] = { 1: 4, 2: 3, 3: 3, 4: 1 };
fullCasterSlots[8] = { 1: 4, 2: 3, 3: 3, 4: 2 };
fullCasterSlots[9] = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 };
fullCasterSlots[10] = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 };
fullCasterSlots[11] = { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 };
fullCasterSlots[12] = { ...fullCasterSlots[11] };
fullCasterSlots[13] = { ...fullCasterSlots[12], 7: 1 };
fullCasterSlots[14] = { ...fullCasterSlots[13] };
fullCasterSlots[15] = { ...fullCasterSlots[14], 8: 1 };
fullCasterSlots[16] = { ...fullCasterSlots[15] };
fullCasterSlots[17] = { ...fullCasterSlots[16], 9: 1 };
fullCasterSlots[18] = { ...fullCasterSlots[17], 5: 3 }; // Ajustement PHB : niveau 18 : 5e=3 (Wizard table fournie montre 3)
fullCasterSlots[19] = { ...fullCasterSlots[18], 6: 2 };
fullCasterSlots[20] = { ...fullCasterSlots[19], 7: 2 };

/* -------------------------
   2. Half caster (Paladin / Rôdeur standard)
   Index = niveau perso
-------------------------- */
const halfCasterSlots = makeEmptySlotMatrix();
halfCasterSlots[1] = {};
halfCasterSlots[2] = { 1: 2 };
halfCasterSlots[3] = { 1: 3 };
halfCasterSlots[4] = { 1: 3 };
halfCasterSlots[5] = { 1: 4, 2: 2 };
halfCasterSlots[6] = { 1: 4, 2: 2 };
halfCasterSlots[7] = { 1: 4, 2: 3 };
halfCasterSlots[8] = { 1: 4, 2: 3 };
halfCasterSlots[9] = { 1: 4, 2: 3, 3: 2 };
halfCasterSlots[10] = { 1: 4, 2: 3, 3: 2 };
halfCasterSlots[11] = { 1: 4, 2: 3, 3: 3 };
halfCasterSlots[12] = { 1: 4, 2: 3, 3: 3 };
halfCasterSlots[13] = { 1: 4, 2: 3, 3: 3, 4: 1 };
halfCasterSlots[14] = { 1: 4, 2: 3, 3: 3, 4: 1 };
halfCasterSlots[15] = { 1: 4, 2: 3, 3: 3, 4: 2 };
halfCasterSlots[16] = { 1: 4, 2: 3, 3: 3, 4: 2 };
halfCasterSlots[17] = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 };
halfCasterSlots[18] = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 };
halfCasterSlots[19] = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 2 };
halfCasterSlots[20] = { ...halfCasterSlots[19] };

/* -------------------------
   3. Warlock (Occultiste) Pact Magic
   À partir du tableau fourni
-------------------------- */
const warlockPact: PactSlotInfo[] = new Array(21).fill(null);
warlockPact[1] = { slots: 1, slotLevel: 1 };
warlockPact[2] = { slots: 2, slotLevel: 1 };
warlockPact[3] = { slots: 2, slotLevel: 2 };
warlockPact[4] = { slots: 2, slotLevel: 2 };
warlockPact[5] = { slots: 2, slotLevel: 3 };
warlockPact[6] = { slots: 2, slotLevel: 3 };
warlockPact[7] = { slots: 2, slotLevel: 4 };
warlockPact[8] = { slots: 2, slotLevel: 4 };
warlockPact[9] = { slots: 2, slotLevel: 5 };
warlockPact[10] = { slots: 2, slotLevel: 5 };
warlockPact[11] = { slots: 3, slotLevel: 5 };
warlockPact[12] = { slots: 3, slotLevel: 5 };
warlockPact[13] = { slots: 3, slotLevel: 5 };
warlockPact[14] = { slots: 3, slotLevel: 5 };
warlockPact[15] = { slots: 3, slotLevel: 5 };
warlockPact[16] = { slots: 3, slotLevel: 5 };
warlockPact[17] = { slots: 4, slotLevel: 5 };
warlockPact[18] = { slots: 4, slotLevel: 5 };
warlockPact[19] = { slots: 4, slotLevel: 5 };
warlockPact[20] = { slots: 4, slotLevel: 5 };

/* -------------------------
   4. Tables "Sorts préparés" / Cantrips (extraits des fichiers)
   (Index = niveau de 1 à 20, position 0 ignorée)
-------------------------- */

// Sorcerer (Ensorceleur) — Sorts préparés (table du fichier)
const sorcererPrepared = [
  0,
  2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22
];
// Sorcerer cantrips (4→5→6)
const sorcererCantrips = [
  0,
  4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6
];

// Warlock (Occultiste) Sorts préparés (depuis le tableau fourni)
const warlockPrepared = [
  0,
  2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15
];
// Warlock cantrips (Sorts mineurs)
const warlockCantrips = [
  0,
  2,2,2,3,5,5,6,6,7,7,7,8,8,8,9,9,9,10,10,10
];

// Wizard (Magicien) table fournie "Sorts préparés"
const wizardPrepared = [
  0,
  4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25
];
// Wizard cantrips
const wizardCantrips = [
  0,
  3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5
];

/* -------------------------
   5. Déclaration des progressions par classe
-------------------------- */
const PROGRESSIONS: ClassSpellProgression[] = [
  {
    keyVariants: ['magicien', 'wizard'],
    casterType: 'full',
    cantripsKnown: wizardCantrips,
    preparedTable: wizardPrepared,
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['clerc', 'cleric'],
    casterType: 'full',
    cantripsKnown: [0,3,3,3,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5],
    // Clerc : souvent (mod SAG + niveau) — si tu veux table : remplace preparedFormula par preparedTable
    preparedFormula: (lvl, wisMod) => Math.max(1, lvl + wisMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['druide', 'druid'],
    casterType: 'full',
    cantripsKnown: [0,2,2,2,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4],
    preparedFormula: (lvl, wisMod) => Math.max(1, lvl + wisMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['barde', 'bard'],
    casterType: 'full',
    cantripsKnown: [0,2,2,2,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4],
    // 2024 Barde peut être en "préparé" aussi — à ajuster selon ton adoption
    preparedFormula: (lvl, chaMod) => Math.max(1, lvl + chaMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['ensorceleur', 'sorcerer'],
    casterType: 'full',
    cantripsKnown: sorcererCantrips,
    preparedTable: sorcererPrepared,
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['occultiste', 'warlock'],
    casterType: 'pact',
    cantripsKnown: warlockCantrips,
    preparedTable: warlockPrepared,
    pactSlots: warlockPact,
    mysticArcanumLevels: [11,13,15,17]
  },
  {
    keyVariants: ['paladin'],
    casterType: 'half',
    cantripsKnown: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Paladin pas de cantrips (sauf variantes)
    preparedFormula: (lvl, chaMod) => Math.max(1, Math.floor(lvl / 2) + chaMod),
    slotMatrix: halfCasterSlots
  },
  {
    keyVariants: ['rôdeur', 'rodeur', 'ranger'],
    casterType: 'half',
    cantripsKnown: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // Ranger 5e pas de cantrips (sauf UA/2024)
    preparedFormula: (lvl, wisMod) => Math.max(1, Math.floor(lvl / 2) + wisMod),
    slotMatrix: halfCasterSlots
  }
];

/* -------------------------
   6. Fonctions utilitaires publiques
-------------------------- */

export function findProgression(className?: string | null): ClassSpellProgression | null {
  if (!className) return null;
  const norm = className.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return PROGRESSIONS.find(p => p.keyVariants.some(v =>
    norm.includes(v.normalize('NFD').replace(/\p{Diacritic}/gu, ''))
  )) || null;
}

export interface ComputedSpellSlots {
  level1?: number; used1?: number;
  level2?: number; used2?: number;
  level3?: number; used3?: number;
  level4?: number; used4?: number;
  level5?: number; used5?: number;
  level6?: number; used6?: number;
  level7?: number; used7?: number;
  level8?: number; used8?: number;
  level9?: number; used9?: number;
  // Ajout éventuel pour Warlock : pactSlotsSynth (facultatif)
  pact_slot_level?: number;
  pact_slots_total?: number;
  pact_slots_used?: number;
}

/**
 * Construit les spell_slots normalisés à partir de la progression
 * Conserve les compteurs usedN si possible, réinitialise si le slot disparaît.
 */
export function computeSpellSlots(
  className: string | null | undefined,
  level: number,
  previous?: Partial<ComputedSpellSlots> | null
): ComputedSpellSlots {
  const prog = findProgression(className);
  const base: ComputedSpellSlots = {};
  if (!prog || level <= 0) return base;

  if (prog.casterType === 'pact' && prog.pactSlots) {
    const pact = prog.pactSlots[level];
    if (pact) {
      base.pact_slot_level = pact.slotLevel;
      base.pact_slots_total = pact.slots;
      // On stocke l'utilisation dans used1 par convention OU on ajoute un champ distinct
      // Ici, on ajoute dedicated: pact_slots_used
      base.pact_slots_used = Math.min(
        (previous?.pact_slots_used || 0),
        pact.slots
      );
    }
    return base;
  }

  const slotMatrix = prog.slotMatrix;
  if (!slotMatrix) return base;
  const row = slotMatrix[level] || {};
  for (let spellLevel = 1; spellLevel <= 9; spellLevel++) {
    const key = `level${spellLevel}` as keyof ComputedSpellSlots;
    const usedKey = `used${spellLevel}` as keyof ComputedSpellSlots;
    if (row[spellLevel]) {
      (base as any)[key] = row[spellLevel];
      const prevUsed = (previous as any)?.[usedKey] || 0;
      (base as any)[usedKey] = Math.min(prevUsed, row[spellLevel]);
    } else {
      // Non disponible à ce niveau
      (base as any)[key] = 0;
      (base as any)[usedKey] = 0;
    }
  }
  return base;
}

export function getMaxPrepared(
  className: string | null | undefined,
  level: number,
  abilityMod: number
): number | null {
  const prog = findProgression(className);
  if (!prog) return null;
  if (prog.preparedTable) return prog.preparedTable[level] ?? null;
  if (prog.preparedFormula) return prog.preparedFormula(level, abilityMod);
  return null;
}

export function getMaxCantrips(
  className: string | null | undefined,
  level: number
): number | null {
  const prog = findProgression(className);
  if (!prog || !prog.cantripsKnown) return null;
  return prog.cantripsKnown[level] ?? null;
}

export function isWarlock(className?: string | null): boolean {
  const p = findProgression(className);
  return p?.casterType === 'pact';
}

export function getMysticArcanumLevels(className?: string | null): number[] {
  const p = findProgression(className);
  return p?.mysticArcanumLevels || [];
}