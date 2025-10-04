import type { SpellSlots, DndClass } from '../types/dnd';

const clampLevel = (n: number) => Math.max(1, Math.min(20, n));

// Tables de progression des sorts mineurs (2024)
export const BARD_CANTRIPS = [0, 2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
export const SORCERER_CANTRIPS = [0, 4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6];
export const WARLOCK_CANTRIPS = [0, 2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
export const CLERIC_CANTRIPS = [0, 3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5];
export const DRUID_CANTRIPS = [0, 2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
export const WIZARD_CANTRIPS = [0, 3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5];

// Tables de progression des sorts préparés (2024)
export const BARD_PREPARED = [0, 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
export const SORCERER_PREPARED = [0, 2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
export const WARLOCK_PREPARED = [0, 2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15];
export const CLERIC_PREPARED = [0, 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
export const DRUID_PREPARED = [0, 4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
export const WIZARD_PREPARED = [0, 4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25];
export const PALADIN_PREPARED = [0, 2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15];
export const RANGER_PREPARED = [0, 2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15];

// Tables d'emplacements de sorts (2024)
// Full Casters (Barde, Ensorceleur, Clerc, Druide, Magicien)
export const FULL_CASTER_SLOTS = [
  {},
  { level1: 2 },
  { level1: 3 },
  { level1: 4, level2: 2 },
  { level1: 4, level2: 3 },
  { level1: 4, level2: 3, level3: 2 },
  { level1: 4, level2: 3, level3: 3 },
  { level1: 4, level2: 3, level3: 3, level4: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 2 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2, level6: 1, level7: 1, level8: 1, level9: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 1, level7: 1, level8: 1, level9: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 2, level7: 1, level8: 1, level9: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 3, level6: 2, level7: 2, level8: 1, level9: 1 }
];

// Half Casters (Paladin, Rôdeur)
export const HALF_CASTER_SLOTS = [
  {},
  {},
  { level1: 2 },
  { level1: 3 },
  { level1: 3 },
  { level1: 4, level2: 2 },
  { level1: 4, level2: 2 },
  { level1: 4, level2: 3 },
  { level1: 4, level2: 3 },
  { level1: 4, level2: 3, level3: 2 },
  { level1: 4, level2: 3, level3: 2 },
  { level1: 4, level2: 3, level3: 3 },
  { level1: 4, level2: 3, level3: 3 },
  { level1: 4, level2: 3, level3: 3, level4: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 2 },
  { level1: 4, level2: 3, level3: 3, level4: 2 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 1 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2 },
  { level1: 4, level2: 3, level3: 3, level4: 3, level5: 2 }
];

// Occultiste (Pact Magic - spécial)
export const WARLOCK_SLOTS = [
  {},
  { pact_slots: 1, pact_level: 1 },
  { pact_slots: 2, pact_level: 1 },
  { pact_slots: 2, pact_level: 2 },
  { pact_slots: 2, pact_level: 2 },
  { pact_slots: 2, pact_level: 3 },
  { pact_slots: 2, pact_level: 3 },
  { pact_slots: 2, pact_level: 4 },
  { pact_slots: 2, pact_level: 4 },
  { pact_slots: 2, pact_level: 5 },
  { pact_slots: 2, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 3, pact_level: 5 },
  { pact_slots: 4, pact_level: 5 },
  { pact_slots: 4, pact_level: 5 },
  { pact_slots: 4, pact_level: 5 },
  { pact_slots: 4, pact_level: 5 }
];

export function getSpellSlotsByLevel(
  playerClass: DndClass | string | null | undefined,
  level: number,
  currentSlots?: SpellSlots | null
): SpellSlots {
  const lvl = clampLevel(level);

  // Classes sans sorts ou non-lanceurs
  if (
    !playerClass ||
    playerClass === '' ||
    playerClass === 'Moine' ||
    playerClass === 'Guerrier' ||
    playerClass === 'Barbare' ||
    playerClass === 'Roublard'
  ) {
    return currentSlots || {};
  }

  // Occultiste (Pact Magic)
  if (playerClass === 'Occultiste') {
    const warlockData = WARLOCK_SLOTS[lvl];
    return {
      ...currentSlots,
      pact_slots: warlockData.pact_slots,
      pact_level: warlockData.pact_level,
      used_pact_slots: currentSlots?.used_pact_slots || 0
    };
  }

  // Full casters
  const fullCasters = ['Magicien', 'Ensorceleur', 'Barde', 'Clerc', 'Druide'];
  if (fullCasters.includes(playerClass)) {
    const slots = FULL_CASTER_SLOTS[lvl];
    return {
      ...currentSlots,
      ...slots,
      used1: currentSlots?.used1 || 0,
      used2: currentSlots?.used2 || 0,
      used3: currentSlots?.used3 || 0,
      used4: currentSlots?.used4 || 0,
      used5: currentSlots?.used5 || 0,
      used6: currentSlots?.used6 || 0,
      used7: currentSlots?.used7 || 0,
      used8: currentSlots?.used8 || 0,
      used9: currentSlots?.used9 || 0
    };
  }

  // Half casters
  const halfCasters = ['Paladin', 'Rôdeur'];
  if (halfCasters.includes(playerClass)) {
    const slots = HALF_CASTER_SLOTS[lvl];
    return {
      ...currentSlots,
      ...slots,
      used1: currentSlots?.used1 || 0,
      used2: currentSlots?.used2 || 0,
      used3: currentSlots?.used3 || 0,
      used4: currentSlots?.used4 || 0,
      used5: currentSlots?.used5 || 0
    };
  }

  return currentSlots || {};
}

export type SpellInfo =
  | { kind: 'prepared'; cantrips?: number; prepared: number; label: string; note?: string }
  | { kind: 'none' };

export function getSpellKnowledgeInfo(
  playerClass: DndClass | string | null | undefined,
  level: number
): SpellInfo {
  const lvl = clampLevel(level);
  const cls = (playerClass || '').toString();

  switch (cls) {
    case 'Barde':
      return {
        kind: 'prepared',
        cantrips: BARD_CANTRIPS[lvl],
        prepared: BARD_PREPARED[lvl],
        label: 'Barde',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Ensorceleur':
      return {
        kind: 'prepared',
        cantrips: SORCERER_CANTRIPS[lvl],
        prepared: SORCERER_PREPARED[lvl],
        label: 'Ensorceleur',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Occultiste':
      return {
        kind: 'prepared',
        cantrips: WARLOCK_CANTRIPS[lvl],
        prepared: WARLOCK_PREPARED[lvl],
        label: 'Occultiste',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Clerc':
      return {
        kind: 'prepared',
        cantrips: CLERIC_CANTRIPS[lvl],
        prepared: CLERIC_PREPARED[lvl],
        label: 'Clerc',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Druide':
      return {
        kind: 'prepared',
        cantrips: DRUID_CANTRIPS[lvl],
        prepared: DRUID_PREPARED[lvl],
        label: 'Druide',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Magicien':
      return {
        kind: 'prepared',
        cantrips: WIZARD_CANTRIPS[lvl],
        prepared: WIZARD_PREPARED[lvl],
        label: 'Magicien',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Paladin':
      return {
        kind: 'prepared',
        prepared: PALADIN_PREPARED[lvl],
        label: 'Paladin',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    case 'Rodeur':
    case 'Rôdeur':
      return {
        kind: 'prepared',
        prepared: RANGER_PREPARED[lvl],
        label: 'Rôdeur',
        note: 'Nombre de sorts préparés au niveau ' + level
      };
    default:
      return { kind: 'none' };
  }
}
