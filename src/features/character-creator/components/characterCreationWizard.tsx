import React, { useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import ProgressBar from './ui/ProgressBar';
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';

import { DndClass } from '../types/character';
import { calculateArmorClass, calculateHitPoints, calculateModifier } from '../utils/dndCalculations';

import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import { CharacterExportPayload } from '../../../types/CharacterExport';

/* ===========================================================
   Étapes
   =========================================================== */

const steps = ['Race', 'Classe', 'Historique', 'Caractéristiques', 'Résumé'];

type WizardProps = {
  onFinish: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
};

/* ===========================================================
   Helpers
   =========================================================== */

function getHitDieForClass(cls?: string): 'd6' | 'd8' | 'd10' | 'd12' {
  switch (cls) {
    case 'Barbare':
      return 'd12';
    case 'Guerrier':
    case 'Paladin':
    case 'Rôdeur':
      return 'd10';
    case 'Barde':
    case 'Clerc':
    case 'Druide':
    case 'Moine':
    case 'Occultiste':
    case 'Roublard':
      return 'd8';
    case 'Ensorceleur':
    case 'Magicien':
    default:
      return 'd6';
  }
}

/* ===========================================================
   Composant principal
   =========================================================== */

export default function CharacterCreationWizard({ onFinish, onCancel }: WizardProps) {
  // Étape courante
  const [currentStep, setCurrentStep] = useState(0);

  // Identité
  const [characterName, setCharacterName] = useState('');

  // Choix principaux
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState<DndClass | ''>('');
  const [selectedBackground, setSelectedBackground] = useState('');

  // Choix dépendants
  const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState<'A' | 'B' | ''>('');
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]); // normalisées (ex: "Discrétion")

  // Caractéristiques (base) et “effectives” (base + historique)
  const [abilities, setAbilities] = useState<Record<string, number>>({
    Force: 8,
    Dextérité: 8,
    Constitution: 8,
    Intelligence: 8,
    Sagesse: 8,
    Charisme: 8,
  });
  const [effectiveAbilities, setEffectiveAbilities] = useState<Record<string, number>>(abilities);

  // Objet d'historique sélectionné
  const selectedBackgroundObj = useMemo(
    () => backgrounds.find((b) => b.name === selectedBackground) || null,
    [selectedBackground]
  );

  // Resets cohérents
  useEffect(() => {
    // Si la classe change, réinitialiser les compétences de classe choisies
    setSelectedClassSkills([]);
  }, [selectedClass]);

  useEffect(() => {
    // Si l’historique change, réinitialiser le choix d’équipement A/B
    setBackgroundEquipmentOption('');
  }, [selectedBackground]);

  // Navigation
  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const previousStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  /* ===========================================================
     Finalisation / Export vers l’app parente
     =========================================================== */
  const handleFinish = () => {
    const raceData = races.find((r) => r.name === selectedRace);
    const classData = classes.find((c) => c.name === selectedClass);

    // Partir des “abilities effectives” (base + historique)
    const finalAbilities = { ...effectiveAbilities };

    // Appliquer les bonus raciaux si présents
    if (raceData?.abilityScoreIncrease) {
      Object.entries(raceData.abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (finalAbilities[ability] != null) {
          finalAbilities[ability] += bonus;
        }
      });
    }

    // Dérivés de combat
    const hitPoints = calculateHitPoints(finalAbilities['Constitution'] || 10, selectedClass as DndClass);
    const armorClass = calculateArmorClass(finalAbilities['Dextérité'] || 10);
    const initiative = calculateModifier(finalAbilities['Dextérité'] || 10);

    // Vitesse: on reste en pieds (service convertira en mètres)
    const speedFeet = raceData?.speed || 30;

    // Équipement d’historique selon Option A/B
    const bgEquip =
      backgroundEquipmentOption === 'A'
        ? selectedBackgroundObj?.equipmentOptions?.optionA ?? []
        : backgroundEquipmentOption === 'B'
        ? selectedBackgroundObj?.equipmentOptions?.optionB ?? []
        : [];

    // Maîtrises (classe + historique)
    const proficientSkills = Array.from(
      new Set([...(selectedClassSkills || []), ...((selectedBackgroundObj?.skillProficiencies ?? []))])
    );

    // Champs optionnels (si vos datasets les exposent)
    const backgroundFeat = (selectedBackgroundObj as any)?.feat as string | undefined;
    const gold = (selectedBackgroundObj as any)?.startingGold ?? (classData as any)?.startingGold;

    // Dés de vie (total = niveau, 0 utilisé)
    const hitDice = {
      die: getHitDieForClass(selectedClass as string),
      total: 1,
      used: 0,
    };

    const payload: CharacterExportPayload = {
      characterName: characterName.trim(),
      selectedRace,
      selectedClass: (selectedClass as string) || '',
      selectedBackground,
      level: 1,
      finalAbilities,
      proficientSkills,
      equipment: [...(classData?.equipment ?? []), ...bgEquip],
      selectedBackgroundEquipmentOption: backgroundEquipmentOption,
      hitPoints,
      armorClass,
      initiative,
      speed: speedFeet,
      backgroundFeat,
      gold: typeof gold === 'number' ? gold : undefined,
      hitDice,
    };

    onFinish(payload);
  };

  /* ===========================================================
     Rendu des étapes
     =========================================================== */
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <RaceSelection
            selectedRace={selectedRace}
            // Compat: certaines versions utilisent onSelectRace
            onRaceSelect={(race: string) => setSelectedRace(race)}
            onSelectRace={(race: string) => setSelectedRace(race)}
            onNext={nextStep}
          />
        );

      case 1:
        return (
          <ClassSelection
            selectedClass={selectedClass}
            onClassSelect={(cls: DndClass | '') => {
              setSelectedClass(cls);
              setSelectedClassSkills([]);
            }}
            // Compat: variantes possibles
            onSelectClass={(cls: DndClass | '') => {
              setSelectedClass(cls);
              setSelectedClassSkills([]);
            }}
            selectedSkills={selectedClassSkills}
            onSelectedSkillsChange={(skills: string[]) => setSelectedClassSkills(skills)}
            // Fallback si l’étape attend un toggle unitaire
            onToggleSkill={(skill: string, allowed?: number) => {
              setSelectedClassSkills((prev) => {
                const exists = prev.includes(skill);
                if (exists) return prev.filter((s) => s !== skill);
                if (allowed != null && prev.length >= allowed) return prev;
                return [...prev, skill];
              });
            }}
            onNext={nextStep}
            onPrevious={previousStep}
            onPrev={previousStep}
          />
        );

      case 2:
        return (
          <BackgroundSelection
            selectedBackground={selectedBackground}
            onBackgroundSelect={(bg: string) => {
              setSelectedBackground(bg);
              setBackgroundEquipmentOption('');
            }}
            // Compat
            onSelectBackground={(bg: string) => {
              setSelectedBackground(bg);
              setBackgroundEquipmentOption('');
            }}
            selectedEquipmentOption={backgroundEquipmentOption}
            onEquipmentOptionChange={(opt: 'A' | 'B' | '') => setBackgroundEquipmentOption(opt)}
            onNext={nextStep}
            onPrevious={previousStep}
            onPrev={previousStep}
          />
        );

      case 3:
        return (
          <AbilityScores
            abilities={abilities}
            onAbilitiesChange={(next: Record<string, number>) => setAbilities(next)}
            selectedBackground={selectedBackgroundObj}
            // Remonte “base + historique” pour tout le reste du process
            onEffectiveAbilitiesChange={(next: Record<string, number>) => setEffectiveAbilities(next)}
            onNext={nextStep}
            onPrevious={previousStep}
            onPrev={previousStep}
          />
        );

      case 4:
        return (
          <CharacterSummary
            characterName={characterName}
            onCharacterNameChange={setCharacterName}
            selectedRace={selectedRace}
            selectedClass={selectedClass as DndClass}
            selectedBackground={selectedBackground}
            abilities={effectiveAbilities}
            // Affichage des compétences (si implémenté) + équipement historique
            selectedClassSkills={selectedClassSkills}
            selectedBackgroundEquipmentOption={backgroundEquipmentOption}
            // IMPORTANT: ne pas appeler Supabase ici. Remonter le payload seulement.
            onFinish={handleFinish}
            onPrevious={previousStep}
          />
        );

      default:
        return null;
    }
  };

  /* ===========================================================
     Layout général (conservé)
     =========================================================== */
  return (
    <div className="min-h-screen bg-fantasy relative">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-gray-800 text-white border border-gray-700',
          duration: 4000,
        }}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Créateur de Personnage D&D
          </h1>
          <p className="text-gray-400">
            Créez votre héros pour vos aventures dans les Donjons et Dragons
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <ProgressBar
            currentStep={currentStep}
            totalSteps={steps.length - 1}
            steps={steps}
          />

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 md:p-8 mt-6">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  );
}