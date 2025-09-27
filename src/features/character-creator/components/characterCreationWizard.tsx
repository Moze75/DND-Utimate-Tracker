import React, { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';

import ProgressBar from './ui/ProgressBar';
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';

import { DndClass } from '../types/character';
import { supabase } from '../lib/supabase';
import { calculateArmorClass, calculateHitPoints, calculateModifier } from '../utils/dndCalculations';

import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';

/* ===========================================================
   Utilitaires
   =========================================================== */

// Convertit ft -> m en arrondissant au 0,5 m (30 ft → 9 m)
const feetToMeters = (ft?: number) => {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9; // fallback raisonnable
  return Math.round(n * 0.3048 * 2) / 2;
};

// Notifie le parent (iframe/opener) qu’un personnage a été créé
type CreatedEvent = {
  type: 'creator:character_created';
  payload: { playerId: string; player?: any };
};
const notifyParentCreated = (playerId: string, player?: any) => {
  const msg: CreatedEvent = { type: 'creator:character_created', payload: { playerId, player } };
  try { window.parent?.postMessage(msg, '*'); } catch {}
  try { (window as any).opener?.postMessage(msg, '*'); } catch {}
  try { window.postMessage(msg, '*'); } catch {}
};

/* ===========================================================
   Étapes (sans sous-classe)
   =========================================================== */

const steps = ['Race', 'Classe', 'Historique', 'Caractéristiques', 'Résumé'];

export default function CharacterCreationWizard() {
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
    'Force': 8,
    'Dextérité': 8,
    'Constitution': 8,
    'Intelligence': 8,
    'Sagesse': 8,
    'Charisme': 8,
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
     Finalisation / Enregistrement
     =========================================================== */
  const handleFinish = async () => {
    try {
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth?.user;
      if (!user) {
        toast.error('Vous devez être connecté pour créer un personnage');
        return;
      }

      const raceData = races.find((r) => r.name === selectedRace);
      const classData = classes.find((c) => c.name === selectedClass);

      // Partir des “abilities effectives” (base + historique) calculées dans AbilityScores
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

      // Vitesse en mètres
      const speedMeters = feetToMeters(raceData?.speed || 30);

      // Équipement d’historique selon Option A/B
      const bgEquip =
        backgroundEquipmentOption === 'A'
          ? selectedBackgroundObj?.equipmentOptions?.optionA ?? []
          : backgroundEquipmentOption === 'B'
            ? selectedBackgroundObj?.equipmentOptions?.optionB ?? []
            : [];

      // Données minimales compatibles (le Tracker saura enrichir/éditer ensuite)
      const characterData = {
        user_id: user.id,
        name: characterName.trim(),
        // Optionnel: on peut dupliquer dans adventurer_name
        adventurer_name: characterName.trim(),
        level: 1,
        current_hp: hitPoints,
        max_hp: hitPoints,
        class: selectedClass || null,
        subclass: null, // pas de sous-classe au niveau 1
        race: selectedRace || null,
        background: selectedBackground || null,
        stats: {
          armor_class: armorClass,
          initiative: initiative,
          speed: speedMeters,            // stockée en mètres
          proficiency_bonus: 2,
          inspirations: 0,
          // On peut stocker des métadonnées souples
          feats: {},
        },
        // Le Tracker affichera par défaut s’il n’a pas d’abilities[]
        abilities: null,
        equipment: {
          starting_equipment: classData?.equipment || [],
          background_equipment_option: backgroundEquipmentOption || null,
          background_equipment_items: bgEquip,
        },
        // Garde une trace des maîtrises choisies (utile pour migration ultérieure)
        proficiencies: {
          skills_from_class: selectedClassSkills,
          skills_from_background: selectedBackgroundObj?.skillProficiencies ?? [],
          saving_throws: classData?.savingThrows ?? [],
        },
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error } = await supabase
        .from('players')
        .insert([characterData])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating character:', error);
        toast.error('Erreur lors de la création du personnage');
        return;
      }

      // Notifier l’app parente (pour l’intégration avec le Tracker)
      if (inserted?.id) {
        notifyParentCreated(inserted.id, inserted);
      }

      toast.success('Personnage créé avec succès !');

      // Reset complet
      setCurrentStep(0);
      setCharacterName('');
      setSelectedRace('');
      setSelectedClass('');
      setSelectedBackground('');
      setBackgroundEquipmentOption('');
      setSelectedClassSkills([]);
      setAbilities({
        'Force': 8,
        'Dextérité': 8,
        'Constitution': 8,
        'Intelligence': 8,
        'Sagesse': 8,
        'Charisme': 8,
      });
      setEffectiveAbilities({
        'Force': 8,
        'Dextérité': 8,
        'Constitution': 8,
        'Intelligence': 8,
        'Sagesse': 8,
        'Charisme': 8,
      });
    } catch (err) {
      console.error('Error creating character:', err);
      toast.error('Erreur lors de la création du personnage');
    }
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
            onRaceSelect={setSelectedRace}
            onNext={nextStep}
          />
        );

      case 1:
        return (
          <ClassSelection
            selectedClass={selectedClass}
            onClassSelect={setSelectedClass}
            // Compétences cliquables dans la classe
            selectedSkills={selectedClassSkills}
            onSelectedSkillsChange={setSelectedClassSkills}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 2:
        return (
          <BackgroundSelection
            selectedBackground={selectedBackground}
            onBackgroundSelect={setSelectedBackground}
            // Option A / B d’équipement d’historique
            selectedEquipmentOption={backgroundEquipmentOption}
            onEquipmentOptionChange={setBackgroundEquipmentOption}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 3:
        return (
          <AbilityScores
            abilities={abilities}
            onAbilitiesChange={setAbilities}
            selectedBackground={selectedBackgroundObj}
            // Remonte “base + historique” pour tout le reste du process
            onEffectiveAbilitiesChange={setEffectiveAbilities}
            onNext={nextStep}
            onPrevious={previousStep}
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
            onFinish={handleFinish}
            onPrevious={previousStep}
          />
        );

      default:
        return null;
    }
  };

  /* ===========================================================
     Layout général
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Créateur de Personnage D&D
            </h1>
            <p className="text-gray-400">
              Créez votre héros pour vos aventures dans les Donjons et Dragons
            </p>
          </div>

          <ProgressBar
            currentStep={currentStep}
            totalSteps={steps.length - 1}
            steps={steps}
          />

          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 md:p-8">
            {renderStep()}
          </div>
        </div>
      </div>
    </div>
  ); 
}