import React, { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';

import ProgressBar from './ui/ProgressBar';
import RaceSelection from './steps/RaceSelection';
import ClassSelection from './steps/ClassSelection';
import BackgroundSelection from './steps/BackgroundSelection';
import AbilityScores from './steps/AbilityScores';
import CharacterSummary from './steps/CharacterSummary';

import { DndClass } from '../types/character';
import type { CharacterExportPayload } from '../types/CharacterExport';
import { supabase } from '../../../lib/supabase';
import { calculateArmorClass, calculateHitPoints, calculateModifier } from '../utils/dndCalculations';

import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import { enrichEquipmentList, determineAutoEquip } from '../../../services/equipmentLookupService';

/* ===========================================================
   Utilitaires
   =========================================================== */

// Convertit ft -> m en arrondissant au 0,5 m (30 ft → 9 m)
const feetToMeters = (ft?: number) => {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9; // fallback raisonnable
  return Math.round(n * 0.3048 * 2) / 2;
};

// Mappe une classe vers une image publique placée dans /public/*.png
function getClassImageUrlLocal(className: DndClass | string | undefined | null): string | null {
  if (!className) return null;
  switch (className) {
    case 'Guerrier': return '/Guerrier.png';
    case 'Magicien': return '/Magicien.png';
    case 'Roublard': return '/Voleur.png';
    case 'Clerc': return '/Clerc.png';
    case 'Rôdeur': return '/Rodeur.png';
    case 'Barbare': return '/Barbare.png';
    case 'Barde': return '/Barde.png';
    case 'Druide': return '/Druide.png';
    case 'Moine': return '/Moine.png';
    case 'Paladin': return '/Paladin.png';
    case 'Ensorceleur': return '/Ensorceleur.png';
    case 'Occultiste': return '/Occultiste.png';
    default:
      return null;
  }
}

// Normalise le don d'historique pour coller à la liste attendue par l'app
function normalizeBackgroundFeat(feat?: string | null): string | undefined {
  if (!feat) return undefined;
  const trimmed = feat.trim();
  if (trimmed.toLowerCase().startsWith('initié à la magie')) {
    return 'Initié à la magie';
  }
  return trimmed;
}

// Parse l'or ("X po") dans la liste d'items d'équipement
function parseGoldFromItems(items?: string[]): number | undefined {
  if (!Array.isArray(items)) return undefined;
  let total = 0;
  for (const it of items) {
    const m = String(it).match(/(\d+)\s*po\b/i);
    if (m) total += parseInt(m[1], 10);
  }
  return total > 0 ? total : undefined;
}

// Tente d'uploader une image dans le bucket Supabase "avatars"
async function tryUploadAvatarFromUrl(playerId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    const contentType = blob.type || 'image/png';
    const ext = (() => {
      const t = contentType.split('/')[1]?.toLowerCase();
      if (t === 'jpeg') return 'jpg';
      return t || 'png';
    })();

    const fileName = `class-${Date.now()}.${ext}`;
    const filePath = `${playerId}/${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType });

    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl || null;
  } catch (e) {
    console.warn('Upload avatar depuis URL impossible:', e);
    return null;
  }
}

// Notifie le parent qu'un personnage a été créé
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
   Étapes
   =========================================================== */

const steps = ['Race', 'Classe', 'Historique', 'Caractéristiques', 'Résumé'];

interface WizardProps {
  onFinish?: (payload: CharacterExportPayload) => void;
  onCancel?: () => void;
}

export default function CharacterCreationWizard({ onFinish, onCancel }: WizardProps) {
  // Étape courante
  const [currentStep, setCurrentStep] = useState(0);

  // État de chargement des équipements
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Identité
  const [characterName, setCharacterName] = useState('');

  // Choix principaux
  const [selectedRace, setSelectedRace] = useState('');
  const [selectedClass, setSelectedClass] = useState<DndClass | ''>('');
  const [selectedBackground, setSelectedBackground] = useState('');

  // Choix dépendants
  const [backgroundEquipmentOption, setBackgroundEquipmentOption] = useState<'A' | 'B' | ''>('');
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  const [selectedEquipmentOption, setSelectedEquipmentOption] = useState<string>('');

  // Caractéristiques
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
    setSelectedClassSkills([]);
    setSelectedEquipmentOption('');
  }, [selectedClass]);

  useEffect(() => {
    setBackgroundEquipmentOption('');
  }, [selectedBackground]);

  // Navigation
  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const previousStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  // Finalisation
  const handleFinish = async () => {
    try {
      const raceData = races.find((r) => r.name === selectedRace);
      const classData = classes.find((c) => c.name === selectedClass);

      // Abilities finales
      const finalAbilities = { ...effectiveAbilities };
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
      const speedFeet = raceData?.speed || 30;

      // Équipement de classe selon l'option sélectionnée
      const classEquipment = selectedEquipmentOption && classData?.equipmentOptions
        ? classData.equipmentOptions.find(opt => opt.label === selectedEquipmentOption)?.items || []
        : classData?.equipment || [];

      // Équipement d'historique
      const bgEquip =
        backgroundEquipmentOption === 'A'
          ? selectedBackgroundObj?.equipmentOptions?.optionA ?? []
          : backgroundEquipmentOption === 'B'
            ? selectedBackgroundObj?.equipmentOptions?.optionB ?? []
            : [];

      // Compétences maîtrisées
      const backgroundSkills = selectedBackgroundObj?.skillProficiencies ?? [];
      const proficientSkills = Array.from(new Set([...(selectedClassSkills || []), ...backgroundSkills]));

      // Équipement combiné
      const equipment = [...classEquipment, ...bgEquip];

      // Don d'historique
      const backgroundFeat = normalizeBackgroundFeat(selectedBackgroundObj?.feat);

      // Or initial
      const goldFromClassEquipment = parseGoldFromItems(classEquipment);
      const goldFromA = parseGoldFromItems(selectedBackgroundObj?.equipmentOptions?.optionA);
      const goldFromB = parseGoldFromItems(selectedBackgroundObj?.equipmentOptions?.optionB);
      
      const backgroundGold = backgroundEquipmentOption === 'A'
        ? goldFromA
        : backgroundEquipmentOption === 'B'
        ? goldFromB
        : undefined;

      const gold = (goldFromClassEquipment || 0) + (backgroundGold || 0);

      // Image de classe
      const avatarImageUrl = getClassImageUrlLocal(selectedClass) ?? undefined;

      // MODE INTÉGRÉ
      if (typeof onFinish === 'function') {
        setLoadingEquipment(true);

        let equipmentDetails;
        try {
          const enriched = await enrichEquipmentList(equipment);
          equipmentDetails = determineAutoEquip(enriched);
        } catch (error) {
          console.error('Erreur lors de l\'enrichissement des équipements:', error);
          toast.error('Impossible de charger les équipements. Création sans équipement.');
          equipmentDetails = [];
        } finally {
          setLoadingEquipment(false);
        }

        const payload: CharacterExportPayload = {
          characterName: characterName.trim() || 'Héros sans nom',
          selectedRace: selectedRace || '',
          selectedClass: (selectedClass as DndClass) || '',
          selectedBackground: selectedBackground || '',
          level: 1,
          finalAbilities,
          proficientSkills,
          equipment,
          selectedBackgroundEquipmentOption: backgroundEquipmentOption || '',
          selectedEquipmentOption: selectedEquipmentOption || '',
          hitPoints,
          armorClass,
          initiative,
          speed: speedFeet,
          backgroundFeat,
          gold: gold > 0 ? gold : undefined,
          weaponProficiencies: classData?.weaponProficiencies || [],
          equipmentDetails,
          armorProficiencies: classData?.armorProficiencies || [],
          toolProficiencies: classData?.toolProficiencies || [],
          racialTraits: raceData?.traits || [],
          classFeatures: classData?.features || [],
          backgroundFeature: selectedBackgroundObj?.feature || '',
          savingThrows: classData?.savingThrows || [],
          languages: raceData?.languages || [],
          hitDice: {
            die: (selectedClass === 'Magicien' || selectedClass === 'Ensorceleur') ? 'd6'
               : (selectedClass === 'Barde' || selectedClass === 'Clerc' || selectedClass === 'Druide' || selectedClass === 'Moine' || selectedClass === 'Rôdeur' || selectedClass === 'Roublard' || selectedClass === 'Occultiste') ? 'd8'
               : (selectedClass === 'Guerrier' || selectedClass === 'Paladin') ? 'd10'
               : 'd12',
            total: 1,
            used: 0,
          },
          avatarImageUrl,
        };

        onFinish(payload);
        return;
      }

      // FALLBACK AUTONOME
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth?.user;
      if (!user) {
        toast.error('Vous devez être connecté pour créer un personnage');
        return;
      }

      const featsData: any = {};
      if (backgroundFeat) {
        featsData.origins = [backgroundFeat];
        featsData.origin = backgroundFeat;
      }

      const initialGold = gold > 0 ? gold : 0;

      const characterData: any = {
        user_id: user.id,
        name: characterName.trim(),
        adventurer_name: characterName.trim(),
        level: 1,
        current_hp: hitPoints,
        max_hp: hitPoints,
        class: selectedClass || null,
        subclass: null,
        race: selectedRace || null,
        background: selectedBackground || null,
        stats: {
          armor_class: armorClass,
          initiative: initiative,
          speed: feetToMeters(speedFeet),
          proficiency_bonus: 2,
          inspirations: 0,
          feats: featsData,
          coins: { gp: initialGold, sp: 0, cp: 0 },
          gold: initialGold,
          creator_meta: {
            class_skills: selectedClassSkills,
            class_equipment_option: selectedEquipmentOption || null,
            class_equipment_items: classEquipment,
            background_skillProficiencies: backgroundSkills,
            background_equipment_option: backgroundEquipmentOption || null,
            background_equipment_items: bgEquip,
            weapon_proficiencies: classData?.weaponProficiencies || [],
            armor_proficiencies: classData?.armorProficiencies || [],
            tool_proficiencies: classData?.toolProficiencies || [],
          },
        },
        abilities: null,
        gold: initialGold,
        silver: 0,
        copper: 0,
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

      // Upload avatar
      let finalPlayer = inserted;
      if (inserted?.id && avatarImageUrl) {
        try {
          const uploaded = await tryUploadAvatarFromUrl(inserted.id, avatarImageUrl);
          const finalUrl = uploaded ?? avatarImageUrl;

          const { data: updatedPlayer, error: avatarErr } = await supabase
            .from('players')
            .update({ avatar_url: finalUrl })
            .eq('id', inserted.id)
            .select('*')
            .single();

          if (!avatarErr && updatedPlayer) {
            finalPlayer = updatedPlayer;
          }
        } catch (e) {
          console.warn('Echec avatar:', e);
        }
      }

      if (inserted?.id) {
        notifyParentCreated(inserted.id, finalPlayer);
      }

      toast.success('Personnage créé avec succès !');

      if (typeof onCancel === 'function') {
        onCancel();
        return;
      }

      // Reset
      setCurrentStep(0);
      setCharacterName('');
      setSelectedRace('');
      setSelectedClass('');
      setSelectedBackground('');
      setBackgroundEquipmentOption('');
      setSelectedClassSkills([]);
      setSelectedEquipmentOption('');
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

  // Rendu des étapes
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
            selectedSkills={selectedClassSkills}
            onSelectedSkillsChange={setSelectedClassSkills}
            selectedEquipmentOption={selectedEquipmentOption}
            onSelectedEquipmentOptionChange={setSelectedEquipmentOption}
            onNext={nextStep}
            onPrevious={previousStep}
          />
        );

      case 2:
        return (
          <BackgroundSelection
            selectedBackground={selectedBackground}
            onBackgroundSelect={setSelectedBackground}
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
            selectedClassSkills={selectedClassSkills}
            selectedBackgroundEquipmentOption={backgroundEquipmentOption}
            selectedEquipmentOption={selectedEquipmentOption}
            onFinish={handleFinish}
            onPrevious={previousStep}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-fantasy relative">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-gray-800 text-white border border-gray-700',
          duration: 4000,
        }}
      />

      {loadingEquipment && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4" />
            <p className="text-gray-200">Préparation de l'équipement...</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 pt-0 pb-8">
        <div className="max-w-6xl mx-auto">
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