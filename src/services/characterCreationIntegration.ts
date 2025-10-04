import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload, EnrichedEquipment, ItemMeta } from '../types/CharacterExport';
import { attackService } from './attackService';
import { checkWeaponProficiency, getPlayerWeaponProficiencies } from '../utils/weaponProficiencyChecker';

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

const META_PREFIX = '#meta:';

const stripPriceParentheses = (name: string) =>
  name.replace(/\s*\((?:\d+|\w+|\s|,|\.|\/|-)+\s*p[oa]?\)\s*$/i, '').trim();

const smartCapitalize = (name: string) => {
  const base = stripPriceParentheses(name).trim();
  if (!base) return '';
  const lower = base.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

function injectMetaIntoDescription(desc: string, meta: ItemMeta): string {
  const metaLine = `${META_PREFIX}${JSON.stringify(meta)}`;
  return desc ? `${desc}\n${metaLine}` : metaLine;
}

async function insertEquipmentIntoInventory(
  playerId: string,
  items: EnrichedEquipment[]
): Promise<void> {
  if (!items || items.length === 0) return;

  const insertions = items.map(item => ({
    player_id: playerId,
    name: smartCapitalize(item.name),
    description: injectMetaIntoDescription(item.description, item.meta),
  }));

  const { error } = await supabase
    .from('inventory_items')
    .insert(insertions);

  if (error) {
    console.error('Erreur insertion équipements:', error);
    throw error;
  }
}

async function createWeaponAttack(
  playerId: string,
  weaponName: string,
  weaponMeta: any,
  player: Player
): Promise<void> {
  try {
    const weaponProficiencies = getPlayerWeaponProficiencies(player);
    const proficiencyResult = checkWeaponProficiency(weaponName, weaponProficiencies);

    const payload = {
      player_id: playerId,
      name: weaponName,
      damage_dice: weaponMeta.damageDice || '1d6',
      damage_type: weaponMeta.damageType || 'Tranchant',
      range: weaponMeta.range || 'Corps à corps',
      properties: weaponMeta.properties || '',
      manual_attack_bonus: null,
      manual_damage_bonus: null,
      expertise: proficiencyResult.shouldApplyProficiencyBonus,
      attack_type: 'physical' as const,
      spell_level: null as any,
      ammo_count: 0,
    };

    await attackService.addAttack(payload);
  } catch (err) {
    console.error('Création attaque échouée:', err);
  }
}

async function autoEquipItems(
  playerId: string,
  items: EnrichedEquipment[],
  player: Player
): Promise<void> {
  const { data: inventoryItems, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('player_id', playerId);

  if (error || !inventoryItems) {
    console.error('Impossible de récupérer l\'inventaire:', error);
    return;
  }

  console.log('[autoEquipItems] Items reçus:', items.map(i => ({ name: i.name, type: i.meta.type, autoEquip: i.autoEquip })));
  const toEquip = items.filter(item => item.autoEquip);
  console.log('[autoEquipItems] Items à équiper:', toEquip.map(i => ({ name: i.name, type: i.meta.type })));
  const equipmentUpdates: any = { ...player.equipment };

  const armorItem = toEquip.find(item => item.meta.type === 'armor');
  if (armorItem) {
    const dbItem = inventoryItems.find(i =>
      smartCapitalize(i.name) === smartCapitalize(armorItem.name)
    );
    if (dbItem && armorItem.meta.armor) {
      equipmentUpdates.armor = {
        name: armorItem.name,
        description: armorItem.description,
        inventory_item_id: dbItem.id,
        armor_formula: armorItem.meta.armor,
        shield_bonus: null,
        weapon_meta: null,
      };
    }
  }

  const shieldItem = toEquip.find(item => item.meta.type === 'shield');
  if (shieldItem) {
    const dbItem = inventoryItems.find(i =>
      smartCapitalize(i.name) === smartCapitalize(shieldItem.name)
    );
    if (dbItem && shieldItem.meta.shield) {
      equipmentUpdates.shield = {
        name: shieldItem.name,
        description: shieldItem.description,
        inventory_item_id: dbItem.id,
        shield_bonus: shieldItem.meta.shield.bonus,
        armor_formula: null,
        weapon_meta: null,
      };
    }
  }

  const weaponItems = toEquip.filter(item => item.meta.type === 'weapon');
  const equippedWeapons = [];
  const equippedWeaponNames = new Set<string>();

  for (const weaponItem of weaponItems) {
    const normalizedName = smartCapitalize(weaponItem.name);
    if (equippedWeaponNames.has(normalizedName)) {
      continue;
    }

    const dbItem = inventoryItems.find(i =>
      smartCapitalize(i.name) === normalizedName
    );
    if (dbItem && weaponItem.meta.weapon) {
      equippedWeapons.push({
        inventory_item_id: dbItem.id,
        name: weaponItem.name,
        description: weaponItem.description,
        weapon_meta: weaponItem.meta.weapon,
      });

      equippedWeaponNames.add(normalizedName);

      await createWeaponAttack(
        playerId,
        weaponItem.name,
        weaponItem.meta.weapon,
        player
      );
    }
  }

  if (equippedWeapons.length > 0) {
    equipmentUpdates.weapons = equippedWeapons;
  }

  if (armorItem || shieldItem || equippedWeapons.length > 0) {
    console.log('[autoEquipItems] Mise à jour equipment:', equipmentUpdates);
    const { error: updateError } = await supabase
      .from('players')
      .update({ equipment: equipmentUpdates })
      .eq('id', playerId);

    if (updateError) {
      console.error('Erreur mise à jour equipment:', updateError);
    } else {
      console.log('[autoEquipItems] Equipment mis à jour avec succès');
    }
  } else {
    console.log('[autoEquipItems] Aucun équipement à mettre à jour');
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
    const finalUrl = uploaded ?? payload.avatarImageUrl;
    const { error: avatarErr } = await supabase
      .from('players')
      .update({ avatar_url: finalUrl })
      .eq('id', playerId);
    if (avatarErr) console.warn('Impossible de fixer avatar_url:', avatarErr);
  }

  const { data: newPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (fetchError) throw fetchError;

  if (payload.equipmentDetails && payload.equipmentDetails.length > 0) {
    try {
      await insertEquipmentIntoInventory(playerId as string, payload.equipmentDetails);
      await autoEquipItems(playerId as string, payload.equipmentDetails, newPlayer as Player);
    } catch (error) {
      console.error('Erreur lors de l\'insertion/équipement des items:', error);
    }
  }

  return newPlayer as Player;
}