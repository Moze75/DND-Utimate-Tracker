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

// Mappe une classe vers une image publique placée dans /public/*.png
// Assurez-vous d'avoir ces fichiers:
// - /Guerrier.png
// - /Magicien.png
// - /Voleur.png
// - /Clerc.png
// - /Rodeur.png      (sans accent)
// - /Barbare.png
// - /Barde.png
// - /Druide.png
// - /Moine.png
// - /Paladin.png
// - /Ensorceleur.png
// - /Occultiste.png
function getClassImageUrlLocal(className: DndClass | string | undefined | null): string | null {
  if (!className) return null;
  switch (className) {
    case 'Guerrier': return '/Guerrier.png';
    case 'Magicien': return '/Magicien.png';
    case 'Roublard': return '/Voleur.png';   // fichier Voleur.png
    case 'Clerc': return '/Clerc.png';
    case 'Rôdeur': return '/Rodeur.png';     // sans accent dans le nom de fichier
    case 'Barbare': return '/Barbare.png';
    case 'Barde': return '/Barde.png';
    case 'Druide': return '/Druide.png';
    case 'Moine': return '/Moine.png';
    case 'Paladin': return '/Paladin.png';
    case 'Ensorceleur': return '/Ensorceleur.png';
    case 'Occultiste': return '/Occultiste.png';
    default:
      // Normalisation basique (accents/majuscules) si une autre valeur arrive
      const normalized = String(className)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      if (normalized.includes('guerrier')) return '/Guerrier.png';
      if (normalized.includes('magicien')) return '/Magicien.png';
      if (normalized.includes('roublard') || normalized.includes('voleur')) return '/Voleur.png';
      if (normalized.includes('clerc')) return '/Clerc.png';
      if (normalized.includes('rodeur') || normalized.includes('rôdeur')) return '/Rodeur.png';
      if (normalized.includes('barbare')) return '/Barbare.png';
      if (normalized.includes('barde')) return '/Barde.png';
      if (normalized.includes('druide')) return '/Druide.png';
      if (normalized.includes('moine')) return '/Moine.png';
      if (normalized.includes('paladin')) return '/Paladin.png';
      if (normalized.includes('ensorceleur')) return '/Ensorceleur.png';
      if (normalized.includes('occultiste')) return '/Occultiste.png';
      return null;
  }
}

// Tente d'uploader une image (URL publique ou data URL) dans le bucket Supabase "avatars"
// et retourne l'URL publique Supabase. En cas d'échec, retourne null.
async function tryUploadAvatarFromUrl(playerId: string, url: string): Promise<string | null> {
  try {
    // fetch sur même origine pour /Guerrier.png, etc. (public/)
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();

    // Déterminer content-type et extension
    const contentType = blob.type || 'image/png';
    const ext = (() => {
      const t = contentType.split('/')[1]?.toLowerCase();
      if (t === 'jpeg') return 'jpg';
      return t || 'png';
    })();

    const fileName = `class-${Date.now()}.${ext}`;
    const filePath = `${playerId}/${fileName}`;

    // Upload dans le bucket "avatars"
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType });

    if (uploadErr) throw uploadErr;

    // URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl || null;
  } catch (e) {
    console.warn('Upload avatar depuis URL/dataURL impossible (fallback sur URL directe):', e);
    return null;
  }
}

// Notifie le parent (iframe/opener) qu’un personnage a été créé (fallback autonome)
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

interface WizardProps {
  onFinish?: (payload: CharacterExportPayload) => void; // mode intégré (recommandé)
  onCancel?: () => void; // fermeture par l'hôte
}

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
     Deux modes:
     - Mode intégré (onFinish fourni): on construit un payload complet puis onFinish(payload)
     - Fallback autonome: on insère en base ici (comme avant), + upload avatar, puis onCancel()
     =========================================================== */
  const handleFinish = async () => {
    try {
      // Données référentielles
      const raceData = races.find((r) => r.name === selectedRace);
      const classData = classes.find((c) => c.name === selectedClass);

      // Abilities finales (base + historique)
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

      // Équipement d’historique selon Option A/B
      const bgEquip =
        backgroundEquipmentOption === 'A'
          ? selectedBackgroundObj?.equipmentOptions?.optionA ?? []
          : backgroundEquipmentOption === 'B'
            ? selectedBackgroundObj?.equipmentOptions?.optionB ?? []
            : [];

      // Proficient skills (classe + historique)
      const backgroundSkills = selectedBackgroundObj?.skillProficiencies ?? [];
      const proficientSkills = Array.from(new Set([...(selectedClassSkills || []), ...backgroundSkills]));

      // Équipement combiné (classe + historique sélectionné)
      const equipment = [
        ...(classData?.equipment || []),
        ...bgEquip,
      ];

      // Image de classe par défaut
      const avatarImageUrl = getClassImageUrlLocal(selectedClass) ?? undefined;

      // MODE INTÉGRÉ (recommandé): remonter un CharacterExportPayload au parent
      if (typeof onFinish === 'function') {
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

          hitPoints,
          armorClass,
          initiative,
          speed: speedFeet, // le service d’intégration convertit en m

          // champs optionnels utiles au tracker
          backgroundFeat: undefined,
          gold: undefined,
          hitDice: {
            die:
              (selectedClass === 'Magicien' || selectedClass === 'Ensorceleur')
                ? 'd6'
                : (selectedClass === 'Barde' || selectedClass === 'Clerc' || selectedClass === 'Druide' || selectedClass === 'Moine' || selectedClass === 'Rôdeur' || selectedClass === 'Roublard' || selectedClass === 'Occultiste')
                ? 'd8'
                : (selectedClass === 'Guerrier' || selectedClass === 'Paladin')
                ? 'd10'
                : 'd12', // Barbare
            total: 1,
            used: 0,
          },

          // NOUVEAU: image/portrait sélectionné (par défaut: image de classe)
          avatarImageUrl,
        };

        // Appelle l’hôte: il fera la création (createCharacterFromCreatorPayload), fermera la modale, etc.
        onFinish(payload);
        return;
      }

      // FALLBACK AUTONOME (si aucun onFinish n’est fourni): insert direct en base + avatar
      const { data: auth, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = auth?.user;
      if (!user) {
        toast.error('Vous devez être connecté pour créer un personnage');
        return;
      }

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
          speed: feetToMeters(speedFeet), // stock en mètres
          proficiency_bonus: 2,
          inspirations: 0,
          feats: {},
          // Meta pour ne rien perdre côté schéma
          creator_meta: {
            class_skills: selectedClassSkills,
            background_skillProficiencies: backgroundSkills,
            background_equipment_option: backgroundEquipmentOption || null,
            background_equipment_items: bgEquip,
          },
        },
        abilities: null,
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

      // Avatar de classe: upload dans Supabase Storage et mise à jour de players.avatar_url
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

          if (avatarErr) {
            console.warn('Impossible de fixer avatar_url (fallback affichage direct):', avatarErr);
          } else if (updatedPlayer) {
            finalPlayer = updatedPlayer as typeof inserted;
          }
        } catch (e) {
          console.warn('Echec de la mise à jour de l’avatar (upload/DB):', e);
        }
      }

      // Notifier l’app parente (si elle écoute) + fermer la modale si possible
      if (inserted?.id) {
        notifyParentCreated(inserted.id, finalPlayer);
      }

      toast.success('Personnage créé avec succès !');

      // Fermer si on a un onCancel fourni par l’hôte
      if (typeof onCancel === 'function') {
        onCancel();
        return;
      }

      // Sinon, reset local (reste sur l’écran du wizard)
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
            // Affichage des compétences + équipement historique
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