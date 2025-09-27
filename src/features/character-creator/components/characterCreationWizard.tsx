import React, { useMemo, useState } from 'react';
// import { supabase } from '../lib/supabase'; // SUPPRIMER
import CharacterSummary from './steps/CharacterSummary';
import AbilityScores from './steps/AbilityScores';
// ... tes autres imports d'étapes
import { CharacterExportPayload } from '../../../types/characterCreator';
import { calculateArmorClass, calculateHitPoints, calculateModifier } from '../utils/dndCalculations';
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';

// Typage des props: onFinish fourni par la page parente
type Props = {
  onFinish: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
};

const CharacterCreationWizard: React.FC<Props> = ({ onFinish, onCancel }) => {
  // EXEMPLES d’états (adapte à tes noms/structures actuels)
  const [characterName, setCharacterName] = useState('');
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [abilities, setAbilities] = useState<Record<string, number>>({
    Force: 10,
    Dextérité: 10,
    Constitution: 10,
    Intelligence: 10,
    Sagesse: 10,
    Charisme: 10,
  });
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  const [selectedBackgroundEquipmentOption, setSelectedBackgroundEquipmentOption] =
    useState<'A' | 'B' | ''>('');

  // Calculs finaux (identiques à ta logique actuelle)
  const raceData = races.find(r => r.name === selectedRace);
  const classData = classes.find(c => c.name === selectedClass);
  const backgroundData = backgrounds.find(b => b.name === selectedBackground);

  const finalAbilities = useMemo(() => {
    const fa = { ...abilities };
    if (raceData?.abilityScoreIncrease) {
      for (const [ability, bonus] of Object.entries(raceData.abilityScoreIncrease)) {
        if (fa[ability] != null) fa[ability] += bonus;
      }
    }
    return fa;
  }, [abilities, raceData]);

  const hitPoints = calculateHitPoints(finalAbilities['Constitution'] || 10, selectedClass);
  const armorClass = calculateArmorClass(finalAbilities['Dextérité'] || 10);
  const initiative = calculateModifier(finalAbilities['Dextérité'] || 10);
  const speed = raceData?.speed || 30;

  const bgEquip =
    selectedBackgroundEquipmentOption === 'A'
      ? backgroundData?.equipmentOptions?.optionA ?? []
      : selectedBackgroundEquipmentOption === 'B'
        ? backgroundData?.equipmentOptions?.optionB ?? []
        : [];

  // Remplace toute écriture DB par ce handleFinish qui émet le payload
  const handleFinish = () => {
    const payload: CharacterExportPayload = {
      characterName: characterName.trim(),
      selectedRace,
      selectedClass,
      selectedBackground,
      level: 1,
      finalAbilities,
      proficientSkills: Array.from(new Set([...(selectedClassSkills || []), ...((backgroundData?.skillProficiencies ?? []))])),
      equipment: [...(classData?.equipment ?? []), ...bgEquip],
      selectedBackgroundEquipmentOption,
      hitPoints,
      armorClass,
      initiative,
      speed,
    };
    onFinish(payload);
  };

  // ... ton rendu d’étapes (race, classe, caracs, etc.)
  // À la dernière étape (résumé), passe handleFinish au bouton "Créer le personnage".
  return (
    <div className="w-full">
      {/* ... étapes ... */}
      <CharacterSummary
        characterName={characterName}
        onCharacterNameChange={setCharacterName}
        selectedRace={selectedRace}
        selectedClass={selectedClass as any}
        selectedBackground={selectedBackground}
        abilities={abilities}
        onFinish={handleFinish}        // ICI: appelle la page parente
        onPrevious={() => {/* revenir à l’étape précédente */}}
        selectedClassSkills={selectedClassSkills}
        selectedBackgroundEquipmentOption={selectedBackgroundEquipmentOption}
      />
    </div>
  );
};

export default CharacterCreationWizard;