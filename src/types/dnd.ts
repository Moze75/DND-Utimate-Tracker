// Types D&D centralisés

// IMPORTANT — Compatibilité classes
// - Ajout de "Occultiste" (Warlock) conformément aux règles 2024.
//   Idéalement, migrez vos données vers "Occultiste" puis retirez "Sorcier".
export type DndClass =
  | ''
  | 'Barbare'
  | 'Barde'
  | 'Clerc'
  | 'Druide'
  | 'Ensorceleur'
  | 'Guerrier'
  | 'Magicien'
  | 'Moine'
  | 'Paladin'
  | 'Rôdeur'
  | 'Roublard'
  | 'Occultiste'

export type PlayerBackground =
  | ''
  | 'Acolyte'
  | 'Artisan de guilde'
  | 'Artiste'
  | 'Charlatan'
  | 'Criminel'
  | 'Ermite'
  | 'Héros du peuple'
  | 'Marin'
  | 'Noble'
  | 'Sage'
  | 'Sauvageon'
  | 'Soldat'
  | 'Autre';

export interface SpellSlots {
  level1?: number;
  level2?: number;
  level3?: number;
  level4?: number;
  level5?: number;
  level6?: number;
  level7?: number;
  level8?: number;
  level9?: number;
  used1?: number;
  used2?: number;
  used3?: number;
  used4?: number;
  used5?: number;
  used6?: number;
  used7?: number;
  used8?: number;
  used9?: number;
}

export interface ClassResources {
  // Barbare
  rage?: number;
  used_rage?: number;

  // Barde
  bardic_inspiration?: number; // total (calculé dynamiquement côté app)
  used_bardic_inspiration?: number;

  // Clerc & Paladin (conduits divins)
  channel_divinity?: number;
  used_channel_divinity?: number;

  // Druide
  wild_shape?: number;
  used_wild_shape?: number;

  // Ensorceleur
  sorcery_points?: number;
  used_sorcery_points?: number;

  // Guerrier
  action_surge?: number;
  used_action_surge?: number;

  // Magicien
  arcane_recovery?: boolean;
  used_arcane_recovery?: boolean;

  // Moine (double clé pour compat : credo/ki)
  credo_points?: number;
  used_credo_points?: number;

  // Métabolisme surnaturel (Moine N2+)
  supernatural_metabolism?: number;
  used_supernatural_metabolism?: number;
  
  // Paladin
  lay_on_hands?: number;
  used_lay_on_hands?: number;

  // Rôdeur
  favored_foe?: number;
  used_favored_foe?: number;

  // Roublard
  sneak_attack?: string;

  // Occultiste (Warlock)
  pact_magic?: boolean;
}

export interface PlayerStats {
  armor_class: number;
  initiative: number;
  speed: number;
  proficiency_bonus: number;
  inspirations: number;
  jack_of_all_trades?: boolean;
}

export interface Ability {
  name: string;
  score: number;
  modifier: number;
  savingThrow: number;
  skills: {
    name: string;
    bonus: number;
    isProficient: boolean;
    hasExpertise: boolean;
  }[];
}

// Attaque — unifiée (inclut munitions facultatives)
export interface Attack {
  id: string;
  player_id: string;
  name: string;
  damage_dice: string;
  damage_type: string;
  range: string;
  properties?: string;
  expertise: boolean;
  created_at: string;
  manual_attack_bonus?: number | null;
  manual_damage_bonus?: number | null;
  attack_type?: 'physical' | 'spell';
  spell_level?: number | null;

  // Munitions (optionnelles)
  ammo_type?: string | null;
  ammo_count?: number | null;
}

export interface Player {
  id: string;
  user_id?: string | null;

  equipment?: {
    armor?: { name: string; description: string } | null;
    weapon?: { name: string; description: string } | null;
    shield?: { name: string; description: string } | null;
    potion?: { name: string; description: string } | null;
    jewelry?: { name: string; description: string } | null;
  };

  name: string;
  adventurer_name?: string | null;
  avatar_url?: string | null;

  race?: string | null;
  subclass?: string | null;
  background?: PlayerBackground | null;
  alignment?: string | null;
  languages?: string[];
  age?: string | null;
  gender?: string | null;
  character_history?: string | null;

  avatar_position?: { x: number; y: number } | null;
  avatar_zoom?: number | null;

  class?: DndClass | null;
  level: number;

  max_hp: number;
  current_hp: number;
  temporary_hp: number;

  spell_slots?: SpellSlots | null;
  class_resources?: ClassResources | null;

  gold: number;
  silver: number;
  copper: number;

  created_at: string;

  stats: PlayerStats;
  abilities?: Ability[];

  is_gm?: boolean;

  hit_dice?: {
    total: number;
    used: number;
  };

  is_concentrating?: boolean;
  concentration_spell?: string;

  active_conditions?: string[];
}

export interface Condition {
  id: string;
  name: string;
  description: string;
  effects: string[];
}

export interface InventoryItem {
  id: string;
  player_id: string;
  name: string;
  description?: string | null;
  created_at: string;
}