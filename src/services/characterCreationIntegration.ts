import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload } from '../types/CharacterExport';

// Skills utilisés par StatsTab (orthographe FR)
const SKILL_GROUPS: Record<'Force' | 'Dextérité' | 'Constitution' | 'Intelligence' | 'Sagesse' | 'Charisme', string[]> = {
  Force: ['Athlétisme'],
  Dextérité: ['Acrobaties', 'Discrétion', 'Escamotage'],
  Constitution: [],
  Intelligence: ['Arcanes', 'Histoire', 'Investigation', 'Nature', 'Religion'],
  Sagesse: ['Dressage', 'Médecine', 'Perception', 'Perspicacité'],
  Charisme: ['Intimidation', 'Persuasion', 'Représentation', 'Tromperie'],
};

const SKILL_NAME_MAP: Record<string, string> = {
  Furtivité: 'Discrétion',
  Performance: 'Représentation',
  Perspicacité: 'Perspicacité',
};

function normalizeSkillForTracker(name: string): string {
  return SKILL_NAME_MAP[name] ?? name;
}

function getModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getProficiencyBonusForLevel(level: number): number {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

function feetToMeters(ft?: number): number {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9;
  return Math.round(n * 0.3048 * 2) / 2;
}

function buildAbilitiesForTracker(finalAbilities: Record<string, number>, proficientSkillsRaw: string[], level: number) {
  const proficiency = getProficiencyBonusForLevel(level);
  const profSet = new Set(proficientSkillsRaw.map(normalizeSkillForTracker));

  const ORDER: Array<keyof typeof finalAbilities> = ['Force', 'Dextérité', 'Constitution', 'Intelligence', 'Sagesse', 'Charisme'];

  return ORDER.map((abilityName) => {
    const score = Number(finalAbilities[abilityName] ?? 10);
    const modifier = getModifier(score);

    const skills = (SKILL_GROUPS as any)[abilityName] as string[];
    const skillsDetails = skills.map((skillName) => {
      const isProficient = profSet.has(skillName);
      const hasExpertise = false;
      const bonus = modifier + (isProficient ? proficiency : 0);
      return { name: skillName, bonus, isProficient, hasExpertise };
    });

    const savingThrow = modifier;

    return { name: abilityName, score, modifier, savingThrow, skills: skillsDetails };
  });
}

async function tryUploadAvatarFromUrl(playerId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    // Déduire le content-type/extension
    const contentType = blob.type || 'image/png';
    const ext = (() => {
      const t = contentType.split('/')[1]?.toLowerCase();
      if (t === 'jpeg') return 'jpg';
      return t || 'png';
    })();

    const fileName = `class-${Date.now()}.${ext}`;
    const filePath = `${playerId}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl || null;
  } catch (e) {
    console.warn('Upload avatar depuis URL/dataURL impossible, fallback sur URL directe:', e);
    return null;
  }
}

export async function createCharacterFromCreatorPayload(
  session: any,
  payload: CharacterExportPayload
): Promise<Player> {
  if (!session?.user?.id) throw new Error('Session invalide');

  // 1) Création de base (retourne l'id)
  const { data: playerId, error: rpcError } = await supabase.rpc('create_player_with_defaults', {
    p_user_id: session.user.id,
    p_name: payload.characterName,
    p_adventurer_name: payload.characterName,
  });
  if (rpcError) throw rpcError;

  // 2) Construction des données
  const level = Math.max(1, payload.level ?? 1);
  const proficiency_bonus = getProficiencyBonusForLevel(level);

  const abilitiesArray = buildAbilitiesForTracker(payload.finalAbilities || {}, payload.proficientSkills || [], level);

  // Don d’historique → feats.origins/origin
  const feats: any = {
    origins: payload.backgroundFeat ? [payload.backgroundFeat] : [],
  };
  if (feats.origins.length > 0) feats.origin = feats.origins[0];

  // Argent
  const initialGold =
    typeof payload.gold === 'number'
      ? Math.max(0, payload.gold)
      : payload.selectedBackgroundEquipmentOption === 'A'
      ? 50
      : payload.selectedBackgroundEquipmentOption === 'B'
      ? 15
      : 0;

  const coins = { gp: initialGold, sp: 0, cp: 0 };

  const stats = {
    armor_class: payload.armorClass ?? 10,
    initiative: payload.initiative ?? getModifier((payload.finalAbilities || {})['Dextérité'] ?? 10),
    speed: feetToMeters(payload.speed ?? 30), // mètres (SettingsModal)
    proficiency_bonus,
    inspirations: 0,
    feats,
    coins, // compat
    gold: initialGold, // compat éventuelle
    creator_meta: {
      weapon_proficiencies: payload.weaponProficiencies || [],
      armor_proficiencies: payload.armorProficiencies || [],
      tool_proficiencies: payload.toolProficiencies || [],
    },
    weapon_proficiencies: payload.weaponProficiencies || [],
    armor_proficiencies: payload.armorProficiencies || [],
  };

  // 3) Update robuste sur des colonnes existantes
  const { error: updError } = await supabase
    .from('players')
    .update({
      class: payload.selectedClass || null,
      level,
      race: payload.selectedRace || null,
      background: payload.selectedBackground || null,
      max_hp: payload.hitPoints,
      current_hp: payload.hitPoints,
      abilities: abilitiesArray,
      stats,
      hit_dice: payload.hitDice
        ? { total: payload.hitDice.total, used: payload.hitDice.used, die: payload.hitDice.die }
        : { total: level, used: 0 },

      // Argent top-level (utilisé par EquipmentTab)
      gold: initialGold,
      silver: 0,
      copper: 0,
    })
    .eq('id', playerId);
  if (updError) throw updError;

  if (payload.avatarImageUrl) {
    const uploaded = await tryUploadAvatarFromUrl(playerId as string, payload.avatarImageUrl);
    const finalUrl = uploaded ?? payload.avatarImageUrl; // fallback: garder l’URL telle quelle
    const { error: avatarErr } = await supabase
      .from('players')
      .update({ avatar_url: finalUrl })
      .eq('id', playerId);
    if (avatarErr) console.warn('Impossible de fixer avatar_url:', avatarErr);
  }

  // 4) Retourne le player complet
  const { data: newPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (fetchError) throw fetchError;

  return newPlayer as Player;
}