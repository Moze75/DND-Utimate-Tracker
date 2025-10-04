// Type de données exportées vers l’app DND-Ultimate-Tracker
export interface CharacterExportPayload {
  characterName: string;
  selectedRace: string;
  selectedClass: string;
  selectedBackground: string;
  level: number;

  // Caractéristiques finales (bonus d’historique + raciaux déjà appliqués)
  finalAbilities: Record<string, number>; // ex: { Force: 16, Dextérité: 14, ... }

  // Compétences maîtrisées (noms FR normalisés)
  proficientSkills: string[]; // ex: ["Athlétisme", "Perception"]

  // Équipement (classe + option d’historique si applicable)
  equipment: string[];
  selectedBackgroundEquipmentOption?: 'A' | 'B' | '';

  // Valeurs dérivées prêtes à l’emploi
  hitPoints: number;
  armorClass: number;
  initiative: number;
  speed: number;

  // Nouveaux champs (facultatifs) pour enrichir la création dans le tracker
  backgroundFeat?: string; // "don d'historique" si calculé côté summary/wizard
  gold?: number; // or initial, si le summary l'a calculé

  // Dés de vie (on stocke aussi le dé; SettingsModal utilise total/used)
  hitDice?: {
    die: 'd6' | 'd8' | 'd10' | 'd12';
    total: number; // généralement = level à la création
    used: number;  // 0 au départ
  };

  // NOUVEAU: image/portrait sélectionné dans le créateur
  // Peut être une data URL (data:image/png;base64,...) ou une URL publique
  avatarImageUrl?: string;

  // Maîtrises d'armes, d'armures et d'outils
  weaponProficiencies?: string[];
  armorProficiencies?: string[];
  toolProficiencies?: string[];

  // Traits raciaux et capacités de classe
  racialTraits?: string[];
  classFeatures?: string[];
  backgroundFeature?: string;
  savingThrows?: string[];
  languages?: string[];

  // Option d'équipement de classe sélectionnée
  selectedEquipmentOption?: string;
}