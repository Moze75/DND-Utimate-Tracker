export interface CharacterExportPayload {
  characterName: string;
  selectedRace: string;
  selectedClass: string;
  selectedBackground: string;
  level: number;
  finalAbilities: Record<string, number>;
  proficientSkills: string[];
  equipment: string[];
  selectedBackgroundEquipmentOption?: 'A' | 'B' | '';
  hitPoints: number;
  armorClass: number;
  initiative: number;
  speed: number;
}