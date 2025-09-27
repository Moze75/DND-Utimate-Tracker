export type DndClass = 
  | 'Barbare' | 'Barde' | 'Clerc' | 'Druide' | 'Ensorceleur' 
  | 'Guerrier' | 'Magicien' | 'Moine' | 'Paladin' | 'Rôdeur' 
  | 'Roublard' | 'Sorcier';

export interface PlayerStats {
  armor_class: number;
  initiative: number;
  speed: number;
  proficiency_bonus: number;
  inspirations: number;
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

export interface CharacterCreationData {
  name: string;
  race: string;
  class: DndClass;
  background: string;
  abilities: Ability[];
  skills: string[];
  equipment: string[];
  hitPoints: number;
}

export interface DndRace {
  name: string;
  description: string;
  abilityScoreIncrease: { [key: string]: number };
  size: string;
  speed: number;
  languages: string[];
  proficiencies: string[];
  traits: string[];
}

export interface DndClassData {
  name: DndClass;
  description: string;
  hitDie: number;
  primaryAbility: string[];
  savingThrows: string[];
  skillsToChoose: number;
  availableSkills: string[];
  equipment: string[];
  features: string[];
}

export interface DndBackground {
  name: string;
  description: string;
  skillProficiencies: string[];
  languages: number;
  equipment: string[];
  feature: string;
}

export interface CharacterCreationStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}