import React, { useState, useCallback, useMemo } from 'react';
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
  // ✅ Navigation
  const [currentStep, setCurrentStep] = useState(0);
  
  // ✅ Données de base du personnage
  const [characterName, setCharacterName] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState<DndClass | ''>('');
  const [selectedBackground, setSelectedBackground] = useState('');
  
  // ✅ Caractéristiques (scores de base avant bonus)
  const [baseAbilities, setBaseAbilities] = useState<Record<string, number>>({
    'Force': 8,
    'Dextérité': 8,
    'Constitution': 8,
    'Intelligence': 8,
    'Sagesse': 8,
    'Charisme': 8
  });

  // ✅ CRUCIAL : États pour les sélections de classe
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  const [selectedEquipmentOption, setSelectedEquipmentOption] = useState<string>('');

  // ✅ États pour les sélections d'historique
  const [selectedBackgroundEquipmentOption, setSelectedBackgroundEquipmentOption] = useState<'A' | 'B' | ''>('');

  // ✅ États pour l'export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPayload, setExportPayload] = useState<CharacterExportPayload | null>(null);

  // ✅ Configuration des étapes
  const steps = [
    {
      id: 'race',
      title: 'Espèce',
      component: RaceSelection,
      description: 'Choisissez votre espèce'
    },
    {
      id: 'class',
      title: 'Classe',
      component: ClassSelection,
      description: 'Sélectionnez votre classe et vos compétences'
    },
    {
      id: 'background',
      title: 'Historique',
      component: BackgroundSelection,
      description: 'Définissez votre passé'
    },
    {
      id: 'abilities',
      title: 'Caractéristiques',
      component: AbilityScores,
      description: 'Répartissez vos points de caractéristiques'
    },
    {
      id: 'summary',
      title: 'Résumé',
      component: CharacterSummary,
      description: 'Vérifiez et finalisez votre personnage'
    }
  ];

  // ✅ Calcul des caractéristiques finales avec tous les bonus
  const finalAbilities = useMemo(() => {
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
    if (backgroundData && (backgroundData as any).abilityScoreIncrease) {
      Object.entries((backgroundData as any).abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (fa[ability] != null) fa[ability] += bonus;
      });
    }

    return fa;
  }, [baseAbilities, selectedRace, selectedBackground]);

  // ✅ Validation des étapes
  const canProceedFromStep = useCallback((stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Race
        return selectedRace !== '';
      
      case 1: // Class
        const classData = classes.find(c => c.name === selectedClass);
        if (!selectedClass || !classData) return false;
        
        // Vérifier que les compétences requises sont sélectionnées
        const requiredSkills = classData.skillsToChoose || 0;
        const hasEnoughSkills = selectedClassSkills.length >= requiredSkills;
        
        // Pour l'équipement, on peut le rendre optionnel ou obligatoire
        // Ici je le rends optionnel pour éviter les blocages
        return hasEnoughSkills;
      
      case 2: // Background
        return selectedBackground !== '';
      
      case 3: // Abilities
        const totalPoints = Object.values(baseAbilities).reduce((sum, val) => sum + val, 0);
        const minTotal = 8 * 6; // 48 points minimum
        const maxTotal = 15 * 6; // 90 points maximum
        return totalPoints >= minTotal && totalPoints <= maxTotal;
      
      case 4: // Summary
        return characterName.trim() !== '';
      
      default:
        return true;
    }
  }, [selectedRace, selectedClass, selectedBackground, baseAbilities, characterName, selectedClassSkills]);

  // ✅ Navigation
  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1 && canProceedFromStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, steps.length, canProceedFromStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // ✅ Gestion des changements avec réinitialisation
  const handleClassSelect = useCallback((dndClass: DndClass) => {
    if (dndClass !== selectedClass) {
      // Réinitialiser les sélections liées à la classe
      setSelectedClassSkills([]);
      setSelectedEquipmentOption('');
    }
    setSelectedClass(dndClass);
  }, [selectedClass]);

  const handleBackgroundSelect = useCallback((background: string) => {
    if (background !== selectedBackground) {
      // Réinitialiser les sélections liées à l'historique
      setSelectedBackgroundEquipmentOption('');
    }
    setSelectedBackground(background);
  }, [selectedBackground]);

  // ✅ Génération du payload d'export
  const generateExportPayload = useCallback((): CharacterExportPayload => {
    const raceData = races.find(r => r.name === selectedRace);
    const classData = classes.find(c => c.name === selectedClass);
    const backgroundData = backgrounds.find(b => b.name === selectedBackground);
    const abilities = finalAbilities;

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
      // Données supplémentaires
      weaponProficiencies: classData?.weaponProficiencies || [],
      armorProficiencies: classData?.armorProficiencies || [],
      toolProficiencies: classData?.toolProficiencies || [],
      racialTraits: raceData?.traits || [],
      classFeatures: classData?.features || [],
      backgroundFeature: backgroundData?.feature || '',
      savingThrows: classData?.savingThrows || [],
      languages: raceData?.languages || [],
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

  // ✅ Finalisation avec export
  const handleFinish = useCallback(() => {
    const payload = generateExportPayload();
    setExportPayload(payload);
    setShowExportModal(true);
  }, [generateExportPayload]);

  // ✅ Confirmation de l'export
  const handleConfirmExport = useCallback(() => {
    if (exportPayload) {
      onComplete(exportPayload);
      setShowExportModal(false);
    }
  }, [exportPayload, onComplete]);

  // ✅ Rendu des étapes
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
      
      case 1: // Class
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
            abilities={finalAbilities}
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

  // ✅ Calcul du pourcentage de progression
  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-6xl max-h-[95vh] overflow-hidden bg-gray-900 border border-gray-800 rounded-xl shadow-xl">
          
          {/* ✅ Header avec progression */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">Créateur de personnage</h2>
              <div className="text-sm text-gray-400">
                Étape {currentStep + 1} sur {steps.length}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Barre de progression */}
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
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

          {/* ✅ Titre de l'étape et indicateurs */}
          <div className="px-6 py-4 border-b border-gray-800/50 bg-gray-800/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {steps[currentStep].title}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {steps[currentStep].description}
                </p>
              </div>
              
              {/* Indicateurs visuels de validation */}
              <div className="flex items-center gap-2">
                {steps.map((step, index) => {
                  const isCompleted = index < currentStep || (index === currentStep && canProceedFromStep(index));
                  const isCurrent = index === currentStep;
                  
                  return (
                    <div
                      key={step.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        isCurrent
                          ? 'bg-red-600 text-white ring-2 ring-red-400'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {isCompleted && !isCurrent ? '✓' : index + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ✅ Contenu de l'étape */}
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
            {renderCurrentStep()}
          </div>

          {/* ✅ Footer avec navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800/50 bg-gray-800/20">
            <div className="text-sm text-gray-400">
              {selectedClass && selectedRace && selectedBackground && characterName ? (
                <span className="text-green-400">
                  {characterName || 'Personnage'} • {selectedRace} {selectedClass}
                </span>
              ) : (
                <span>Création en cours...</span>
              )}
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
                ← Précédent
              </button>
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceedFromStep(currentStep)}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    canProceedFromStep(currentStep)
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Suivant →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={!canProceedFromStep(currentStep)}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    canProceedFromStep(currentStep)
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  ✓ Créer le personnage
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Modal d'export */}
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