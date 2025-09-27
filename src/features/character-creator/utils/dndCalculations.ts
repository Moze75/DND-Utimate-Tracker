import { DndClass } from '../types/character';

export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateHitPoints(constitution: number, dndClass: DndClass, level: number = 1): number {
  const hitDice: Record<DndClass, number> = {
    'Barbare': 12,
    'Guerrier': 10,
    'Paladin': 10,
    'Rôdeur': 10,
    'Barde': 8,
    'Clerc': 8,
    'Druide': 8,
    'Moine': 8,
    'Roublard': 8,
    'Occultiste': 8,
    'Ensorceleur': 6,
    'Magicien': 6
  };

  const hitDie = hitDice[dndClass];
  const constitutionModifier = calculateModifier(constitution);
  
  return hitDie + constitutionModifier + (level - 1) * (Math.floor(hitDie / 2) + 1 + constitutionModifier);
}

export function calculateArmorClass(dexterity: number, armor: string = 'none'): number {
  const dexModifier = calculateModifier(dexterity);
  
  const armorValues: Record<string, { base: number; maxDex?: number }> = {
    'none': { base: 10 },
    'leather': { base: 11 },
    'studded_leather': { base: 12 },
    'chain_mail': { base: 16 },
    'chain_shirt': { base: 13 },
    'scale_mail': { base: 14, maxDex: 2 },
    'plate': { base: 18, maxDex: 0 }
  };

  const armorData = armorValues[armor] || armorValues.none;
  const maxDexBonus = armorData.maxDex ?? dexModifier;
  
  return armorData.base + Math.min(dexModifier, maxDexBonus);
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function validatePointBuy(abilities: Record<string, number>): { valid: boolean; pointsUsed: number; errors: string[] } {
  const pointCosts: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
  };

  let totalPoints = 0;
  const errors: string[] = [];

  Object.entries(abilities).forEach(([ability, score]) => {
    if (score < 8 || score > 15) {
      errors.push(`${ability}: Score must be between 8 and 15`);
    } else {
      totalPoints += pointCosts[score];
    }
  });

  if (totalPoints > 27) {
    errors.push(`Too many points used: ${totalPoints}/27`);
  }

  return {
    valid: errors.length === 0 && totalPoints <= 27,
    pointsUsed: totalPoints,
    errors
  };
}

export const standardArray = [15, 14, 13, 12, 10, 8];

export function rollAbilityScore(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => b - a);
  return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
}

/**
 * Application des bonus d'historique aux caractéristiques de base
 * - mode 'oneOneOne': +1 à chacune des 3 caracs autorisées par le background
 * - mode 'twoPlusOne': +2 sur une carac autorisée, +1 sur une autre carac autorisée (différente)
 */
export type BackgroundBonusMode = 'twoPlusOne' | 'oneOneOne';

export function applyBackgroundBonuses(
  base: Record<string, number>,
  backgroundAbilities: string[],
  mode: BackgroundBonusMode,
  assignments?: { plusTwo?: string; plusOne?: string }
): Record<string, number> {
  const result: Record<string, number> = { ...base };

  if (!backgroundAbilities || backgroundAbilities.length !== 3) {
    // Rien à appliquer si le background ne définit pas correctement ses 3 caracs
    return result;
  }

  if (mode === 'oneOneOne') {
    for (const ability of backgroundAbilities) {
      result[ability] = (result[ability] ?? 0) + 1;
    }
    return result;
  }

  // mode twoPlusOne
  const plusTwo = assignments?.plusTwo;
  const plusOne = assignments?.plusOne;

  // Besoin de deux caracs distinctes, toutes deux autorisées par le background
  if (
    !plusTwo ||
    !plusOne ||
    plusTwo === plusOne ||
    !backgroundAbilities.includes(plusTwo) ||
    !backgroundAbilities.includes(plusOne)
  ) {
    return result;
  }

  result[plusTwo] = (result[plusTwo] ?? 0) + 2;
  result[plusOne] = (result[plusOne] ?? 0) + 1;

  return result;
}