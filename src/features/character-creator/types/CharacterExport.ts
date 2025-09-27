// Type de données exportées vers l’app DND-Ultimate-Tracker
export interface CharacterExportPayload {
  characterName: string;
  selectedRace: string;
  selectedClass: string;
  selectedBackground: string;
  level: number;

  // Caractéristiques finales (bonus arrière-plan + raciaux déjà appliqués)
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
}