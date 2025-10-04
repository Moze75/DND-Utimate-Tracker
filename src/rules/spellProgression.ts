/* Centralisation des progressions de sorts / emplacements / préparation
   Basé sur les tableaux fournis (Magicien, Ensorceleur, Occultiste) + progression standard 5e.
   Ajuste librement selon tes variantes 2024.
*/

export type CasterType = 'full' | 'half' | 'pact' | 'none';

export interface PactSlotInfo {
  slots: number;
  slotLevel: number;
}

export interface ClassSpellProgression {
  keyVariants: string[];
  casterType: CasterType;
  cantripsKnown?: number[];
  preparedTable?: number[];
  preparedFormula?: (level: number, abilityMod: number) => number;
  spellsKnownTable?: number[];
  slotMatrix?: Array<Record<number, number>>;
  pactSlots?: PactSlotInfo[];
  mysticArcanumLevels?: number[];
}

const makeEmptySlotMatrix = (): Array<Record<number, number>> =>
  new Array(21).fill(null).map(() => ({}));

/* ---------- Full Caster Slots (PHB standard) ---------- */
const fullCasterSlots = makeEmptySlotMatrix();
fullCasterSlots[1]  = {1:2};
fullCasterSlots[2]  = {1:3};
fullCasterSlots[3]  = {1:4,2:2};
fullCasterSlots[4]  = {1:4,2:3};
fullCasterSlots[5]  = {1:4,2:3,3:2};
fullCasterSlots[6]  = {1:4,2:3,3:3};
fullCasterSlots[7]  = {1:4,2:3,3:3,4:1};
fullCasterSlots[8]  = {1:4,2:3,3:3,4:2};
fullCasterSlots[9]  = {1:4,2:3,3:3,4:3,5:1};
fullCasterSlots[10] = {1:4,2:3,3:3,4:3,5:2};
fullCasterSlots[11] = {1:4,2:3,3:3,4:3,5:2,6:1};
fullCasterSlots[12] = {...fullCasterSlots[11]};
fullCasterSlots[13] = {...fullCasterSlots[12],7:1};
fullCasterSlots[14] = {...fullCasterSlots[13]};
fullCasterSlots[15] = {...fullCasterSlots[14],8:1};
fullCasterSlots[16] = {...fullCasterSlots[15]};
fullCasterSlots[17] = {...fullCasterSlots[16],9:1};
fullCasterSlots[18] = {...fullCasterSlots[17],5:3};
fullCasterSlots[19] = {...fullCasterSlots[18],6:2};
fullCasterSlots[20] = {...fullCasterSlots[19],7:2};

/* ---------- Half Caster Slots (Paladin / Rôdeur) ---------- */
const halfCasterSlots = makeEmptySlotMatrix();
halfCasterSlots[1]  = {};
halfCasterSlots[2]  = {1:2};
halfCasterSlots[3]  = {1:3};
halfCasterSlots[4]  = {1:3};
halfCasterSlots[5]  = {1:4,2:2};
halfCasterSlots[6]  = {1:4,2:2};
halfCasterSlots[7]  = {1:4,2:3};
halfCasterSlots[8]  = {1:4,2:3};
halfCasterSlots[9]  = {1:4,2:3,3:2};
halfCasterSlots[10] = {1:4,2:3,3:2};
halfCasterSlots[11] = {1:4,2:3,3:3};
halfCasterSlots[12] = {1:4,2:3,3:3};
halfCasterSlots[13] = {1:4,2:3,3:3,4:1};
halfCasterSlots[14] = {1:4,2:3,3:3,4:1};
halfCasterSlots[15] = {1:4,2:3,3:3,4:2};
halfCasterSlots[16] = {1:4,2:3,3:3,4:2};
halfCasterSlots[17] = {1:4,2:3,3:3,4:2,5:1};
halfCasterSlots[18] = {1:4,2:3,3:3,4:2,5:1};
halfCasterSlots[19] = {1:4,2:3,3:3,4:2,5:2};
halfCasterSlots[20] = {...halfCasterSlots[19]};

/* ---------- Warlock Pact Slots (Occultiste) ---------- */
const warlockPact: PactSlotInfo[] = new Array(21).fill(null);
warlockPact[1]  = {slots:1,slotLevel:1};
warlockPact[2]  = {slots:2,slotLevel:1};
warlockPact[3]  = {slots:2,slotLevel:2};
warlockPact[4]  = {slots:2,slotLevel:2};
warlockPact[5]  = {slots:2,slotLevel:3};
warlockPact[6]  = {slots:2,slotLevel:3};
warlockPact[7]  = {slots:2,slotLevel:4};
warlockPact[8]  = {slots:2,slotLevel:4};
warlockPact[9]  = {slots:2,slotLevel:5};
warlockPact[10] = {slots:2,slotLevel:5};
warlockPact[11] = {slots:3,slotLevel:5};
warlockPact[12] = {slots:3,slotLevel:5};
warlockPact[13] = {slots:3,slotLevel:5};
warlockPact[14] = {slots:3,slotLevel:5};
warlockPact[15] = {slots:3,slotLevel:5};
warlockPact[16] = {slots:3,slotLevel:5};
warlockPact[17] = {slots:4,slotLevel:5};
warlockPact[18] = {slots:4,slotLevel:5};
warlockPact[19] = {slots:4,slotLevel:5};
warlockPact[20] = {slots:4,slotLevel:5};

/* ---------- Tables préparées / cantrips (extraits fichiers) ---------- */
const sorcererPrepared = [0,2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
const sorcererCantrips = [0,4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6];

const warlockPrepared  = [0,2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15];
const warlockCantrips  = [0,2,2,2,3,5,5,6,6,7,7,7,8,8,8,9,9,9,10,10,10];

const wizardPrepared   = [0,4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25];
const wizardCantrips   = [0,3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5];

const PROGRESSIONS: ClassSpellProgression[] = [
  {
    keyVariants: ['magicien','wizard'],
    casterType: 'full',
    cantripsKnown: wizardCantrips,
    preparedTable: wizardPrepared,
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['clerc','cleric'],
    casterType: 'full',
    cantripsKnown: [0,3,3,3,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5],
    preparedFormula: (lvl, wisMod) => Math.max(1, lvl + wisMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['druide','druid'],
    casterType: 'full',
    cantripsKnown: [0,2,2,2,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4],
    preparedFormula: (lvl, wisMod) => Math.max(1, lvl + wisMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['barde','bard'],
    casterType: 'full',
    cantripsKnown: [0,2,2,2,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4],
    preparedFormula: (lvl, chaMod) => Math.max(1, lvl + chaMod),
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['ensorceleur','sorcerer'],
    casterType: 'full',
    cantripsKnown: sorcererCantrips,
    preparedTable: sorcererPrepared,
    slotMatrix: fullCasterSlots
  },
  {
    keyVariants: ['occultiste','warlock'],
    casterType: 'pact',
    cantripsKnown: warlockCantrips,
    preparedTable: warlockPrepared,
    pactSlots: warlockPact,
    mysticArcanumLevels: [11,13,15,17]
  },
  {
    keyVariants: ['paladin'],
    casterType: 'half',
    preparedFormula: (lvl, chaMod) => Math.max(1, Math.floor(lvl / 2) + chaMod),
    slotMatrix: halfCasterSlots
  },
  {
    keyVariants: ['rôdeur','rodeur','ranger'],
    casterType: 'half',
    preparedFormula: (lvl, wisMod) => Math.max(1, Math.floor(lvl / 2) + wisMod),
    slotMatrix: halfCasterSlots
  }
];

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
  pact_slot_level?: number;
  pact_slots_total?: number;
  pact_slots_used?: number;
}

export function findProgression(className?: string | null): ClassSpellProgression | null {
  if (!className) return null;
  const norm = className.toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return PROGRESSIONS.find(p =>
    p.keyVariants.some(v =>
      norm.includes(v.normalize('NFD').replace(/\p{Diacritic}/gu, ''))
    )
  ) || null;
}

export function computeSpellSlots(
  className: string | null | undefined,
  level: number,
  previous?: Partial<ComputedSpellSlots> | null
): ComputedSpellSlots {
  const prog = findProgression(className);
  const base: ComputedSpellSlots = {};
  if (!prog || level <= 0) return base;

  // Warlock (pact magic)
  if (prog.casterType === 'pact' && prog.pactSlots) {
    const pact = prog.pactSlots[level];
    if (pact) {
      base.pact_slot_level = pact.slotLevel;
      base.pact_slots_total = pact.slots;
      base.pact_slots_used = Math.min(previous?.pact_slots_used || 0, pact.slots);
    }
    return base;
  }

  // Matrix classique
  const row = prog.slotMatrix?.[level] || {};
  for (let sl = 1; sl <= 9; sl++) {
    const capacity = (row as any)[sl] || 0;
    (base as any)[`level${sl}`] = capacity;
    const prevUsed = (previous as any)?.[`used${sl}`] || 0;
    (base as any)[`used${sl}`] = capacity > 0 ? Math.min(prevUsed, capacity) : 0;
  }
  return base;
}

export function isWarlock(className?: string | null): boolean {
  return findProgression(className)?.casterType === 'pact';
}