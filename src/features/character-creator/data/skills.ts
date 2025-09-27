// Source de vérité des compétences, avec normalisation des synonymes
export type AbilityKey = 'Force' | 'Dextérité' | 'Constitution' | 'Intelligence' | 'Sagesse' | 'Charisme';

// Liste canonique FR (utilisée pour l'affichage et le calcul)
export const CANONICAL_SKILLS: string[] = [
  'Acrobaties',
  'Athlétisme',
  'Arcanes',
  'Histoire',
  'Intuition',
  'Investigation',
  'Médecine',
  'Nature',
  'Perception',
  'Représentation',
  'Persuasion',
  'Tromperie',
  'Intimidation',
  'Escamotage',
  'Discrétion',
  'Survie',
  'Dressage',
  'Religion',
];

// Synonymes -> Canonique
const SKILL_SYNONYMS: Record<string, string> = {
  // Stealth
  'Furtivité': 'Discrétion',
  // Insight
  'Perspicacité': 'Intuition',
  // Performance (au cas où)
  'Performance': 'Représentation',
};

// Normalisation: rend la clé telle qu'on la manipule partout (canonique)
export function normalizeSkill(name: string): string {
  const direct = CANONICAL_SKILLS.find((s) => s.toLowerCase() === name.toLowerCase());
  if (direct) return direct;

  // Essayer via synonymes (case-insensitive)
  const foundSyn = Object.keys(SKILL_SYNONYMS).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  if (foundSyn) return SKILL_SYNONYMS[foundSyn];

  // Si inconnu, on renvoie la version d'origine (mais idéalement on l'ajoutera à la liste canonique)
  return name;
}

// Mapping compétence -> caractéristique (canonique)
export const SKILL_ABILITY_MAP: Record<string, AbilityKey> = {
  'Acrobaties': 'Dextérité',
  'Athlétisme': 'Force',
  'Arcanes': 'Intelligence',
  'Histoire': 'Intelligence',
  'Intuition': 'Sagesse',
  'Investigation': 'Intelligence',
  'Médecine': 'Sagesse',
  'Nature': 'Intelligence',
  'Perception': 'Sagesse',
  'Représentation': 'Charisme',
  'Persuasion': 'Charisme',
  'Tromperie': 'Charisme',
  'Intimidation': 'Charisme',
  'Escamotage': 'Dextérité',
  'Discrétion': 'Dextérité',
  'Survie': 'Sagesse',
  'Dressage': 'Sagesse',
  'Religion': 'Intelligence',
};

// Calcule le bonus d'une compétence, à partir des caractéristiques finales,
// avec ou sans maîtrise (pas d'expertise gérée ici).
export function calculateSkillBonus(
  skillName: string,
  finalAbilities: Record<string, number>,
  proficient: boolean,
  proficiencyBonus: number,
): number {
  const normalized = normalizeSkill(skillName);
  const ability = SKILL_ABILITY_MAP[normalized];
  const abilityScore = finalAbilities[ability] ?? 10;
  const mod = Math.floor((abilityScore - 10) / 2);
  return mod + (proficient ? proficiencyBonus : 0);
}