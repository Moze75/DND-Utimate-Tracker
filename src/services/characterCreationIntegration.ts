import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload } from '../types/characterCreator';

// Skills utilisés par StatsTab (orthographe/fr exacte)
const SKILL_GROUPS: Record<
  'Force' | 'Dextérité' | 'Constitution' | 'Intelligence' | 'Sagesse' | 'Charisme',
  string[]
> = {
  Force: ['Athlétisme'],
  Dextérité: ['Acrobaties', 'Discrétion', 'Escamotage'],
  Constitution: [],
  Intelligence: ['Arcanes', 'Histoire', 'Investigation', 'Nature', 'Religion'],
  Sagesse: ['Dressage', 'Médecine', 'Perception', 'Perspicacité'],
  Charisme: ['Intimidation', 'Persuasion', 'Représentation', 'Tromperie'],
};

// Synonymes éventuels venant du creator -> noms canoniques StatsTab
const SKILL_NAME_MAP: Record<string, string> = {
  Furtivité: 'Discrétion',
  Performance: 'Représentation',
  Perspicacité: 'Perspicacité', // déjà aligné
};

function normalizeSkillForTracker(name: string): string {
  // Retourne le nom StatsTab si connu, sinon laisse tel quel
  return SKILL_NAME_MAP[name] ?? name;
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Bonus de maîtrise PHB
function getProficiencyBonusForLevel(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

// Conversion ft -> m arrondi au 0,5 m (30 ft → 9 m)
function feetToMeters(ft?: number): number {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9;
  return Math.round(n * 0.3048 * 2) / 2;
}

// Construit le tableau abilities (format StatsTab) depuis les caracs finales et les maîtrises de compétences
function buildAbilitiesForTracker(
  finalAbilities: Record<string, number>,
  proficientSkillsRaw: string[],
  level: number
) {
  const proficiency = getProficiencyBonusForLevel(level);
  // Set de compétences maîtrisées, normalisées vers les noms StatsTab
  const profSet = new Set(proficientSkillsRaw.map(normalizeSkillForTracker));

  // Liste canonique des 6 caracs pour assurer l’ordre et éviter les oublis
  const ABILITY_ORDER: Array<keyof typeof finalAbilities> = [
    'Force',
    'Dextérité',
    'Constitution',
    'Intelligence',
    'Sagesse',
    'Charisme',
  ];

  return ABILITY_ORDER.map((abilityName) => {
    const score = Number(finalAbilities[abilityName] ?? 10);
    const modifier = getModifier(score);

    const skills = (SKILL_GROUPS as any)[abilityName] as string[];
    const skillsDetails = skills.map((skillName) => {
      const isProficient = profSet.has(skillName);
      const hasExpertise = false; // on ne gère pas l’expertise à la création
      const bonus = modifier + (isProficient ? proficiency : 0);
      return { name: skillName, bonus, isProficient, hasExpertise };
    });

    // Sauvegarde: par défaut = modificateur (sans maîtrise initiale)
    const savingThrow = modifier;

    return {
      name: abilityName,
      score,
      modifier,
      savingThrow,
      skills: skillsDetails,
    };
  });
}

export async function createCharacterFromCreatorPayload(
  session: any,
  payload: CharacterExportPayload
): Promise<Player> {
  if (!session?.user?.id) throw new Error('Session invalide');

  // 1) Créer une ligne de base via la RPC existante (retourne l'id)
  const { data: playerId, error: rpcError } = await supabase.rpc('create_player_with_defaults', {
    p_user_id: session.user.id,
    p_name: payload.characterName,
    p_adventurer_name: payload.characterName,
  });
  if (rpcError) throw rpcError;

  // 2) Construire abilities (array) + stats (json) + champs simples
  const level = Math.max(1, payload.level ?? 1);
  const proficiency_bonus = getProficiencyBonusForLevel(level);

  const abilitiesArray = buildAbilitiesForTracker(payload.finalAbilities || {}, payload.proficientSkills || [], level);

  const stats = {
    armor_class: payload.armorClass ?? 10,
    initiative: payload.initiative ?? getModifier((payload.finalAbilities || {})['Dextérité'] ?? 10),
    speed: feetToMeters(payload.speed ?? 30), // stocké en mètres pour coller au SettingsModal
    proficiency_bonus,
    inspirations: 0,
    feats: {}, // vide à la création, editable ensuite dans le SettingsModal
    // jack_of_all_trades: false, // optionnel; StatsTab gère ça côté classe/niveau
  };

  // 3) Mise à jour minimale et robuste sur des colonnes existantes
  const { error: updError } = await supabase
    .from('players')
    .update({
      class: payload.selectedClass || null,
      level,
      race: payload.selectedRace || null,
      background: payload.selectedBackground || null,
      max_hp: payload.hitPoints,
      current_hp: payload.hitPoints,
      abilities: abilitiesArray, // JSONB tableau
      stats,                     // JSONB objet
      // On NE TOUCHE PAS à des colonnes top-level non-existantes
      // On évite aussi "equipment" si vous n'êtes pas sûr que la colonne existe côté DB
    })
    .eq('id', playerId);
  if (updError) throw updError;

  // 4) Récupérer et retourner le player créé (avec toutes les données)
  const { data: newPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (fetchError) throw fetchError;

  return newPlayer as Player;
}