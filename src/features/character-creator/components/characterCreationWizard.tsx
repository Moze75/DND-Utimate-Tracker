import React, { useState, useCallback, useEffect } from 'react';
import { DndClass } from '../types/character';
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';
import ExportModal from './export/ExportModal';
import { CharacterExportPayload } from '../types/CharacterExport';
import { calculateHitPoints, calculateArmorClass, calculateModifier } from '../utils/dndCalculations';
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';

interface CharacterCreatorWizardProps {
  onComplete: (characterData: any) => void;
  onClose: () => void;
}

const CharacterCreatorWizard: React.FC<CharacterCreatorWizardProps> = ({
  onComplete,
  onClose
}) => {
  // État de navigation
  const [currentStep, setCurrentStep] = useState(0);
  
  // États des données du personnage
  const [characterName, setCharacterName] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState<DndClass | ''>('');
  const [selectedBackground, setSelectedBackground] = useState('');
  
  // Caractéristiques de base (avant bonus raciaux/historique)
  const [baseAbilities, setBaseAbilities] = useState<Record<string, number>>({
    'Force': 8,
    'Dextérité': 8,
    'Constitution': 8,
    'Intelligence': 8,
    'Sagesse': 8,
    'Charisme': 8
  });

  // ✅ AJOUT : Sélections de classe (manquantes dans l'ancienne version)
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  const [selectedEquipmentOption, setSelectedEquipmentOption] = useState<string>('');

  // Sélections d'historique
  const [selectedBackgroundEquipmentOption, setSelectedBackgroundEquipmentOption] = useState<'A' | 'B' | ''>('');

  // État pour l'export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPayload, setExportPayload] = useState<CharacterExportPayload | null>(null);

  const steps = [
    {
      id: 'race',
      title: 'Espèce',
      component: RaceSelection
    },
    {
      id: 'class',
      title: 'Classe',
      component: ClassSelection
    },
    {
      id: 'background',
      title: 'Historique',
      component: BackgroundSelection
    },
    {
      id: 'abilities',
      title: 'Caractéristiques',
      component: AbilityScores
    },
    {
      id: 'summary',
      title: 'Résumé',
      component: CharacterSummary
    }
  ];

  // Calcul des caractéristiques finales avec bonus raciaux et d'historique
  const finalAbilities = useCallback(() => {
    const fa = { ...baseAbilities };
    
    // Bonus raciaux
    const raceData = races.find(r => r.name === selectedRace);
    if (raceData?.abilityScoreIncrease) {
      Object.entries(raceData.abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (fa[ability] != null) fa[ability] += bonus;
      });
    }

    // Bonus d'historique (si votre système en a)
    const backgroundData = backgrounds.find(b => b.name === selectedBackground);
    if (backgroundData?.abilityScoreIncrease) {
      Object.entries(backgroundData.abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (fa[ability] != null) fa[ability] += bonus;
      });
    }

    return fa;
  }, [baseAbilities, selectedRace, selectedBackground]);

  // Navigation
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Réinitialisation des sélections lors du changement de classe
  const handleClassSelect = useCallback((dndClass: DndClass) => {
    if (dndClass !== selectedClass) {
      setSelectedClassSkills([]);
      setSelectedEquipmentOption('');
    }
    setSelectedClass(dndClass);
  }, [selectedClass]);

  // Réinitialisation des sélections lors du changement d'historique
  const handleBackgroundSelect = useCallback((background: string) => {
    if (background !== selectedBackground) {
      setSelectedBackgroundEquipmentOption('');
    }
    setSelectedBackground(background);
  }, [selectedBackground]);

  // Génération du payload d'export
  const generateExportPayload = useCallback((): CharacterExportPayload => {
    const raceData = races.find(r => r.name === selectedRace);
    const classData = classes.find(c => c.name === selectedClass);
    const backgroundData = backgrounds.find(b => b.name === selectedBackground);
    const abilities = finalAbilities();

    // Équipement combiné
    const classEquipment = classData?.equipmentOptions.find(opt => opt.label === selectedEquipmentOption)?.items || [];
    const backgroundEquipment = selectedBackgroundEquipmentOption === 'A' 
      ? (backgroundData as any)?.equipmentOptions?.optionA || []
      : selectedBackgroundEquipmentOption === 'B'
      ? (backgroundData as any)?.equipmentOptions?.optionB || []
      : [];

    // Compétences maîtrisées
    const backgroundSkills = backgroundData?.skillProficiencies || [];
    const allProficientSkills = [...selectedClassSkills, ...backgroundSkills];

    return {
      characterName,
      selectedRace,
      selectedClass: selectedClass as DndClass,
      selectedBackground,
      level: 1,
      finalAbilities: abilities,
      hitPoints: calculateHitPoints(abilities['Constitution'] || 10, selectedClass as DndClass),
      armorClass: calculateArmorClass(abilities['Dextérité'] || 10),
      initiative: calculateModifier(abilities['Dextérité'] || 10),
      speed: raceData?.speed || 30,
      proficientSkills: allProficientSkills,
      equipment: [...classEquipment, ...backgroundEquipment],
      selectedEquipmentOption,
      selectedBackgroundEquipmentOption,
      // Nouvelles données
      weaponProficiencies: classData?.weaponProficiencies || [],
      armorProficiencies: classData?.armorProficiencies || [],
      toolProficiencies: classData?.toolProficiencies || [],
      racialTraits: raceData?.traits || [],
      classFeatures: classData?.features || [],
      backgroundFeature: backgroundData?.feature || '',
      savingThrows: classData?.savingThrows || [],
      languages: raceData?.languages || [],
      // Avatar si disponible
      avatarImageUrl: undefined
    };
  }, [
    characterName,
    selectedRace,
    selectedClass,
    selectedBackground,
    finalAbilities,
    selectedClassSkills,
    selectedEquipmentOption,
    selectedBackgroundEquipmentOption
  ]);

  // Finalisation de la création
  const handleFinish = useCallback(() => {
    const payload = generateExportPayload();
    setExportPayload(payload);
    setShowExportModal(true);
  }, [generateExportPayload]);

  // Confirmation de l'export
  const handleConfirmExport = useCallback(() => {
    if (exportPayload) {
      onComplete(exportPayload);
      setShowExportModal(false);
    }
  }, [exportPayload, onComplete]);

  // Validation des étapes
  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 0: // Race
        return selectedRace !== '';
      case 1: // Class
        const classData = classes.find(c => c.name === selectedClass);
        const hasRequiredSkills = !classData || selectedClassSkills.length >= (classData.skillsToChoose || 0);
        return selectedClass !== '' && hasRequiredSkills;
      case 2: // Background
        return selectedBackground !== '';
      case 3: // Abilities
        return Object.values(baseAbilities).every(score => score >= 8 && score <= 15);
      case 4: // Summary
        return characterName.trim() !== '';
      default:
        return true;
    }
  }, [currentStep, selectedRace, selectedClass, selectedBackground, baseAbilities, characterName, selectedClassSkills]);

  // Auto-navigation si toutes les données requises sont remplies
  useEffect(() => {
    // Optionnel: auto-advance logic
  }, [currentStep]);

  const renderCurrentStep = () => {
    const CurrentStepComponent = steps[currentStep].component;
    
    const commonProps = {
      onNext: handleNext,
      onPrevious: handlePrevious
    };

    switch (currentStep) {
      case 0: // Race
        return (
          <CurrentStepComponent
            {...commonProps}
            selectedRace={selectedRace}
            onRaceSelect={setSelectedRace}
          />
        );
      
      case 1: // Class - ✅ CORRECTION : Ajout des props manquantes
        return (
          <CurrentStepComponent
            {...commonProps}
            selectedClass={selectedClass}
            onClassSelect={handleClassSelect}
            selectedSkills={selectedClassSkills}
            onSelectedSkillsChange={setSelectedClassSkills}
            selectedEquipmentOption={selectedEquipmentOption}
            onSelectedEquipmentOptionChange={setSelectedEquipmentOption}
          />
        );
      
      case 2: // Background
        return (
          <CurrentStepComponent
            {...commonProps}
            selectedBackground={selectedBackground}
            onBackgroundSelect={handleBackgroundSelect}
            selectedBackgroundEquipmentOption={selectedBackgroundEquipmentOption}
            onSelectedBackgroundEquipmentOptionChange={setSelectedBackgroundEquipmentOption}
          />
        );
      
      case 3: // Abilities
        return (
          <CurrentStepComponent
            {...commonProps}
            abilities={baseAbilities}
            onAbilitiesChange={setBaseAbilities}
            selectedRace={selectedRace}
            selectedBackground={selectedBackground}
          />
        );
      
      case 4: // Summary
        return (
          <CurrentStepComponent
            {...commonProps}
            characterName={characterName}
            onCharacterNameChange={setCharacterName}
            selectedRace={selectedRace}
            selectedClass={selectedClass}
            selectedBackground={selectedBackground}
            abilities={finalAbilities()}
            onFinish={handleFinish}
            selectedClassSkills={selectedClassSkills}
            selectedBackgroundEquipmentOption={selectedBackgroundEquipmentOption}
            selectedEquipmentOption={selectedEquipmentOption}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-6xl max-h-[95vh] overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
          {/* Header avec progression */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">Créateur de personnage</h2>
            <div className="flex items-center gap-4">
              {/* Indicateur de progression */}
              <div className="flex items-center gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      index === currentStep
                        ? 'bg-red-600 text-white'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-800 transition-colors"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Titre de l'étape actuelle */}
          <div className="px-6 py-3 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Étape {currentStep + 1}: {steps[currentStep].title}
              </h3>
              {/* Indicateur de validation */}
              <div className="flex items-center gap-2">
                {canProceedToNext() ? (
                  <span className="text-green-400 text-sm">✓ Complété</span>
                ) : (
                  <span className="text-yellow-400 text-sm">⚠ Incomplet</span>
                )}
              </div>
            </div>
          </div>

          {/* Contenu de l'étape */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
            {renderCurrentStep()}
          </div>

          {/* Footer avec navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/50 bg-gray-800/20">
            <div className="text-sm text-gray-400">
              Étape {currentStep + 1} sur {steps.length}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currentStep === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Précédent
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    canProceedToNext()
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Suivant
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={!canProceedToNext()}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    canProceedToNext()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Créer le personnage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'export */}
      <ExportModal
        open={showExportModal}
        payload={exportPayload}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleConfirmExport}
      />
    </>
  );
};

export default CharacterCreatorWizard;