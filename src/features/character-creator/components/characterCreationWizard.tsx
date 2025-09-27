import React, { useMemo, useState } from 'react';

// Étapes (gardent votre mise en page)
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';

// Données et utilitaires de calcul
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import { calculateHitPoints, calculateArmorClass, calculateModifier } from '../utils/dndCalculations';

// Type de payload attendu par l’app parente
import { CharacterExportPayload } from '../../../types/characterCreator';

type WizardProps = {
  onFinish: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
};

enum Step {
  Race = 0,
  Class = 1,
  Background = 2,
  Abilities = 3,
  Summary = 4,
}

const defaultAbilities: Record<string, number> = {
  Force: 10,
  Dextérité: 10,
  Constitution: 10,
  Intelligence: 10,
  Sagesse: 10,
  Charisme: 10,
};

export default function CharacterCreationWizard({ onFinish, onCancel }: WizardProps) {
  // Navigation
  const [step, setStep] = useState<Step>(Step.Race);
  const goNext = () => setStep((s) => Math.min(Step.Summary, s + 1));
  const goPrev = () => setStep((s) => Math.max(Step.Race, s - 1));

  // État de la fiche (garde vos choix et UI)
  const [characterName, setCharacterName] = useState<string>('');
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [abilities, setAbilities] = useState<Record<string, number>>({ ...defaultAbilities });

  // Compétences de classe (sélectionnées dans l’étape Classe)
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  // Option d’équipement d’historique (si votre étape la gère)
  const [selectedBgEquipOption, setSelectedBgEquipOption] = useState<'A' | 'B' | ''>('');

  // Données choisies
  const raceData = useMemo(() => races.find((r) => r.name === selectedRace), [selectedRace]);
  const classData = useMemo(() => classes.find((c) => c.name === selectedClass), [selectedClass]);
  const backgroundData = useMemo(
    () => backgrounds.find((b) => b.name === selectedBackground),
    [selectedBackground]
  );

  // Caracs finales = base + bonus raciaux (les bonus d’historique si vous en avez appliqués en amont)
  const finalAbilities = useMemo(() => {
    const fa = { ...abilities };
    if (raceData?.abilityScoreIncrease) {
      Object.entries(raceData.abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (fa[ability] != null) fa[ability] += bonus;
      });
    }
    return fa;
  }, [abilities, raceData]);

  // Valeurs dérivées
  const hitPoints = useMemo(
    () => calculateHitPoints(finalAbilities['Constitution'] || 10, selectedClass as any),
    [finalAbilities, selectedClass]
  );
  const armorClass = useMemo(
    () => calculateArmorClass(finalAbilities['Dextérité'] || 10),
    [finalAbilities]
  );
  const initiative = useMemo(
    () => calculateModifier(finalAbilities['Dextérité'] || 10),
    [finalAbilities]
  );
  const speed = raceData?.speed || 30;

  // Équipement d’historique (option A/B)
  const bgEquip = useMemo(() => {
    if (!backgroundData?.equipmentOptions) return [];
    if (selectedBgEquipOption === 'A') return backgroundData.equipmentOptions.optionA ?? [];
    if (selectedBgEquipOption === 'B') return backgroundData.equipmentOptions.optionB ?? [];
    return [];
  }, [backgroundData, selectedBgEquipOption]);

  // Validation pour “Suivant”
  const canGoNextFromRace = !!selectedRace;
  const canGoNextFromClass = !!selectedClass;
  const canGoNextFromBackground = !!selectedBackground;
  const canGoNextFromAbilities = true;

  // Construction du payload final et remontée à l’app parente
  const handleFinish = () => {
    const proficientSkills = Array.from(
      new Set([...(selectedClassSkills || []), ...((backgroundData?.skillProficiencies ?? []))])
    );
    const equipment = [...(classData?.equipment ?? []), ...bgEquip];

    const payload: CharacterExportPayload = {
      characterName: characterName.trim(),
      selectedRace,
      selectedClass,
      selectedBackground,
      level: 1,
      finalAbilities,
      proficientSkills,
      equipment,
      selectedBackgroundEquipmentOption: selectedBgEquipOption,
      hitPoints,
      armorClass,
      initiative,
      speed,
    };

    onFinish(payload);
  };

  // Rendu (conserve vos composants d’étapes)
  return (
    <div className="w-full min-h-full bg-transparent text-gray-200">
      {/* Stepper (optionnel) */}
      <div className="w-full px-6 pt-5">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          {[
            { idx: Step.Race, label: 'Espèce' },
            { idx: Step.Class, label: 'Classe' },
            { idx: Step.Background, label: 'Historique' },
            { idx: Step.Abilities, label: 'Caracs' },
            { idx: Step.Summary, label: 'Résumé' },
          ].map((s) => (
            <div
              key={s.idx}
              className={`px-2 py-1 rounded border ${
                step === s.idx ? 'border-red-500 text-red-200' : 'border-gray-700'
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        {step === Step.Race && (
          <RaceSelection
            selectedRace={selectedRace}
            onSelectRace={setSelectedRace}
            onCancel={onCancel}
            onNext={() => canGoNextFromRace && goNext()}
          />
        )}

        {step === Step.Class && (
          <ClassSelection
            selectedClass={selectedClass}
            onSelectClass={(name: string) => {
              setSelectedClass(name);
              setSelectedClassSkills([]); // reset si la classe change
            }}
            selectedSkills={selectedClassSkills}
            onToggleSkill={(skill: string, allowed: number) => {
              setSelectedClassSkills((prev) => {
                const exists = prev.includes(skill);
                if (exists) return prev.filter((s) => s !== skill);
                if (prev.length >= allowed) return prev;
                return [...prev, skill];
              });
            }}
            onPrev={goPrev}
            onCancel={onCancel}
            onNext={() => canGoNextFromClass && goNext()}
          />
        )}

        {step === Step.Background && (
          <BackgroundSelection
            selectedBackground={selectedBackground}
            onSelectBackground={(name: string) => {
              setSelectedBackground(name);
              setSelectedBgEquipOption('');
            }}
            selectedEquipmentOption={selectedBgEquipOption}
            onSelectEquipmentOption={setSelectedBgEquipOption}
            onPrev={goPrev}
            onCancel={onCancel}
            onNext={() => canGoNextFromBackground && goNext()}
          />
        )}

        {step === Step.Abilities && (
          <AbilityScores
            abilities={abilities}
            onChange={(next: Record<string, number>) => setAbilities(next)}
            onPrev={goPrev}
            onCancel={onCancel}
            onNext={() => canGoNextFromAbilities && goNext()}
          />
        )}

        {step === Step.Summary && (
          <CharacterSummary
            characterName={characterName}
            onCharacterNameChange={setCharacterName}
            selectedRace={selectedRace}
            selectedClass={selectedClass as any}
            selectedBackground={selectedBackground}
            abilities={abilities}
            // IMPORTANT: ne pas appeler Supabase ici. On remonte le payload.
            onFinish={handleFinish}
            onPrevious={goPrev}
            selectedClassSkills={selectedClassSkills}
            selectedBackgroundEquipmentOption={selectedBgEquipOption}
          />
        )}
      </div>
    </div>
  );
}