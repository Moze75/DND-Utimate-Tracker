import React, { useMemo, useState } from 'react';

// Données et utilitaires locaux du feature creator
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';

// Résumé (avec modal d’export) – doit exister dans ./steps/CharacterSummary.tsx
// IMPORTANT: Ce composant NE DOIT PAS appeler Supabase. Il doit appeler onFinish(payload).
import CharacterSummary from './steps/CharacterSummary';

// Type du payload attendu par l’app Ultimate Tracker
import { CharacterExportPayload } from '../../../types/characterCreator';

// Optionnel: si vous avez un ensemble de compétences global (pour la sélection de compétences de classe)
const ALL_SKILLS = [
  'Acrobaties',
  'Athlétisme',
  'Arcanes',
  'Histoire',
  'Intuition',
  'Investigation',
  'Médecine',
  'Nature',
  'Perception',
  'Représentation',
  'Persuasion',
  'Tromperie',
  'Intimidation',
  'Escamotage',
  'Discrétion',
  'Survie',
  'Dressage',
  'Religion',
];

type WizardProps = {
  // La page parente (CharacterSelectionPage) reçoit le payload et fait l’écriture DB.
  onFinish: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
};

// Étapes du wizard
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
  // État du wizard
  const [step, setStep] = useState<Step>(Step.Race);

  // État de la fiche
  const [characterName, setCharacterName] = useState<string>('');
  const [selectedRace, setSelectedRace] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedBackground, setSelectedBackground] = useState<string>('');
  const [abilities, setAbilities] = useState<Record<string, number>>({ ...defaultAbilities });

  // Compétences de classe (sélectionnées dans l’étape Classe)
  const [selectedClassSkills, setSelectedClassSkills] = useState<string[]>([]);
  // Option d’équipement d’historique: 'A' | 'B' | ''
  const [selectedBgEquipOption, setSelectedBgEquipOption] = useState<'A' | 'B' | ''>('');

  // Mémo de données sélectionnées
  const raceData = useMemo(() => races.find((r) => r.name === selectedRace), [selectedRace]);
  const classData = useMemo(() => classes.find((c) => c.name === selectedClass), [selectedClass]);
  const backgroundData = useMemo(
    () => backgrounds.find((b) => b.name === selectedBackground),
    [selectedBackground]
  );

  // Navigation
  const canGoNextFromRace = !!selectedRace;
  const canGoNextFromClass = !!selectedClass;
  const canGoNextFromBackground = !!selectedBackground;
  const canGoNextFromAbilities = true;

  const goNext = () => setStep((s) => Math.min(Step.Summary, s + 1));
  const goPrev = () => setStep((s) => Math.max(Step.Race, s - 1));

  // Gestion des caracs
  const setAbility = (key: string, value: number) => {
    setAbilities((prev) => ({ ...prev, [key]: Math.max(1, Math.min(20, Math.floor(value))) }));
  };
  const incAbility = (key: string) => setAbility(key, (abilities[key] || 10) + 1);
  const decAbility = (key: string) => setAbility(key, (abilities[key] || 10) - 1);

  // Sélection de compétences de classe:
  // - Si la classe possède un "skillChoices.count" + "options", on applique cette règle.
  // - Sinon on autorise la sélection libre (2 par défaut).
  const classSkillOptions: string[] = useMemo(() => {
    // Essayez d’utiliser les options définies dans la classe
    const opts =
      (classData as any)?.skillChoices?.options && Array.isArray((classData as any).skillChoices.options)
        ? (classData as any).skillChoices.options
        : ALL_SKILLS;

    return opts;
  }, [classData]);

  const classSkillMax: number = useMemo(() => {
    const count =
      (classData as any)?.skillChoices?.count != null
        ? Number((classData as any).skillChoices.count)
        : 2;
    return Math.max(0, count);
  }, [classData]);

  const toggleClassSkill = (skill: string) => {
    setSelectedClassSkills((prev) => {
      const exists = prev.includes(skill);
      if (exists) return prev.filter((s) => s !== skill);
      if (prev.length >= classSkillMax) return prev; // ne pas dépasser le max
      return [...prev, skill];
    });
  };

  // Écran 1: Race
  const renderRaceStep = () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Étape 1/5 — Choix de l’espèce</h2>
        <button onClick={onCancel} className="text-sm text-gray-300 hover:text-white">
          Annuler
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {races.map((race) => {
          const selected = selectedRace === race.name;
          return (
            <button
              key={race.name}
              onClick={() => setSelectedRace(race.name)}
              className={`text-left p-4 rounded-lg border transition ${
                selected ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-white font-medium">{race.name}</div>
              {race.traits?.length ? (
                <div className="text-xs text-gray-400 mt-1 line-clamp-3">
                  {race.traits.join(' • ')}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">Aucun détail</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <div />
        <button
          onClick={goNext}
          disabled={!canGoNextFromRace}
          className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  // Écran 2: Classe
  const renderClassStep = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Étape 2/5 — Choix de la classe</h2>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-sm text-gray-300 hover:text-white">
            Annuler
          </button>
        </div>
      </div>

      {/* Sélection de classe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const selected = selectedClass === cls.name;
          return (
            <button
              key={cls.name}
              onClick={() => {
                setSelectedClass(cls.name);
                setSelectedClassSkills([]); // reset
              }}
              className={`text-left p-4 rounded-lg border transition ${
                selected ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-white font-medium">{cls.name}</div>
              {cls.features?.length ? (
                <div className="text-xs text-gray-400 mt-1 line-clamp-3">
                  {cls.features.join(' • ')}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">Aucun détail</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Choix des compétences de classe (si applicable) */}
      {selectedClass && (
        <div className="space-y-2">
          <div className="text-sm text-gray-300">
            Sélectionnez jusqu’à{' '}
            <span className="font-semibold text-white">{classSkillMax}</span> compétence
            {classSkillMax > 1 ? 's' : ''} de classe:
          </div>
          <div className="flex flex-wrap gap-2">
            {classSkillOptions.map((s) => {
              const active = selectedClassSkills.includes(s);
              const disabled = !active && selectedClassSkills.length >= classSkillMax;
              return (
                <button
                  key={s}
                  onClick={() => toggleClassSkill(s)}
                  disabled={disabled}
                  className={`px-2 py-1 rounded border text-xs transition ${
                    active
                      ? 'border-red-500 bg-red-500/10 text-red-200'
                      : 'border-gray-600 text-gray-300 hover:border-gray-400'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-gray-400">
            Sélectionnées: {selectedClassSkills.length}/{classSkillMax}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={goPrev} className="btn-secondary px-4 py-2 rounded">
          Précédent
        </button>
        <button
          onClick={goNext}
          disabled={!canGoNextFromClass}
          className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  // Écran 3: Historique
  const renderBackgroundStep = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Étape 3/5 — Historique</h2>
        <button onClick={onCancel} className="text-sm text-gray-300 hover:text-white">
          Annuler
        </button>
      </div>

      {/* Choix d’historique */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {backgrounds.map((bg) => {
          const selected = selectedBackground === bg.name;
          return (
            <button
              key={bg.name}
              onClick={() => {
                setSelectedBackground(bg.name);
                setSelectedBgEquipOption(''); // reset
              }}
              className={`text-left p-4 rounded-lg border transition ${
                selected ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="text-white font-medium">{bg.name}</div>
              {bg.skillProficiencies?.length ? (
                <div className="text-xs text-gray-400 mt-1 line-clamp-3">
                  Maîtrises: {bg.skillProficiencies.join(' • ')}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">Aucune maîtrise listée</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Option d’équipement si disponible */}
      {selectedBackground && backgroundData?.equipmentOptions && (
        <div className="space-y-3">
          <div className="text-sm text-gray-300">Équipement d’historique: choisissez une option</div>
          <div className="flex flex-col gap-3">
            <label
              className={`p-3 rounded border cursor-pointer ${
                selectedBgEquipOption === 'A'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="bg-eq"
                className="mr-2"
                checked={selectedBgEquipOption === 'A'}
                onChange={() => setSelectedBgEquipOption('A')}
              />
              Option A
              <div className="text-xs text-gray-400 mt-1">
                {(backgroundData.equipmentOptions.optionA || []).join(' • ') || '—'}
              </div>
            </label>

            <label
              className={`p-3 rounded border cursor-pointer ${
                selectedBgEquipOption === 'B'
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="bg-eq"
                className="mr-2"
                checked={selectedBgEquipOption === 'B'}
                onChange={() => setSelectedBgEquipOption('B')}
              />
              Option B
              <div className="text-xs text-gray-400 mt-1">
                {(backgroundData.equipmentOptions.optionB || []).join(' • ') || '—'}
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button onClick={goPrev} className="btn-secondary px-4 py-2 rounded">
          Précédent
        </button>
        <button
          onClick={goNext}
          disabled={!canGoNextFromBackground}
          className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  // Écran 4: Caractéristiques
  const renderAbilitiesStep = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Étape 4/5 — Caractéristiques</h2>
        <button onClick={onCancel} className="text-sm text-gray-300 hover:text-white">
          Annuler
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(abilities).map(([ability, score]) => (
          <div key={ability} className="p-4 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-300 mb-2">{ability}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => decAbility(ability)}
                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
              >
                –
              </button>
              <input
                type="number"
                value={score}
                onChange={(e) => setAbility(ability, Number(e.target.value))}
                className="w-16 text-center rounded bg-gray-900 border border-gray-700 text-white py-1"
                min={1}
                max={20}
              />
              <button
                onClick={() => incAbility(ability)}
                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={goPrev} className="btn-secondary px-4 py-2 rounded">
          Précédent
        </button>
        <button
          onClick={goNext}
          disabled={!canGoNextFromAbilities}
          className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Suivant
        </button>
      </div>
    </div>
  );

  // Écran 5: Résumé + export (utilise CharacterSummary qui prépare le payload et appelle onFinish(payload))
  const renderSummaryStep = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Étape 5/5 — Résumé</h2>
        <button onClick={onCancel} className="text-sm text-gray-300 hover:text-white">
          Annuler
        </button>
      </div>

      <CharacterSummary
        characterName={characterName}
        onCharacterNameChange={setCharacterName}
        selectedRace={selectedRace}
        selectedClass={selectedClass as any} // si DndClass est typé dans votre projet, remplacez par le bon type
        selectedBackground={selectedBackground}
        abilities={abilities}
        onFinish={onFinish} // IMPORTANT: le CharacterSummary doit appeler onFinish(payload)
        onPrevious={goPrev}
        selectedClassSkills={selectedClassSkills}
        selectedBackgroundEquipmentOption={selectedBgEquipOption}
      />
    </div>
  );

  // Rendu principal
  return (
    <div className="w-full min-h-full bg-transparent text-gray-200">
      {/* Stepper simple */}
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

      {/* Contenu d’étape */}
      <div className="w-full">
        {step === Step.Race && renderRaceStep()}
        {step === Step.Class && renderClassStep()}
        {step === Step.Background && renderBackgroundStep()}
        {step === Step.Abilities && renderAbilitiesStep()}
        {step === Step.Summary && renderSummaryStep()}
      </div>
    </div>
  );
}