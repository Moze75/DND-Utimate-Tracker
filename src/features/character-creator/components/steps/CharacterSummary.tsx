import React, { useState, useMemo, useEffect } from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Input from '../ui/Input';
import { calculateHitPoints, calculateArmorClass, calculateModifier } from '../../utils/dndCalculations';
import { races } from '../../data/races';
import { classes } from '../../data/classes';
import { backgrounds } from '../../data/backgrounds';
import { DndClass } from '../../types/character';
import { User, Heart, Shield, Zap, Users, BookOpen, Package, Scroll, Star, AlertCircle, X } from 'lucide-react';

interface CharacterSummaryProps {
  characterName: string;
  onCharacterNameChange: (name: string) => void;
  selectedRace: string;
  selectedClass: DndClass;
  selectedBackground: string;
  abilities: Record<string, number>;
  onFinish: () => void;
  onPrevious: () => void;

  // Optionnel: compétences choisies dans ClassSelection (si vous avez branché cette étape)
  selectedClassSkills?: string[];

  // Optionnel: si vous avez ajouté la sélection A/B d'équipement d'historique
  selectedBackgroundEquipmentOption?: 'A' | 'B' | '';
}

// Liste canonique des compétences (FR)
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
] as const;

type SkillName = typeof ALL_SKILLS[number];

// Synonymes -> Canonique pour le calcul
const SKILL_SYNONYMS: Record<string, SkillName> = {
  'Furtivité': 'Discrétion',
  'Perspicacité': 'Intuition',
  'Performance': 'Représentation',
};

function normalizeSkill(name: string): SkillName | string {
  const direct = ALL_SKILLS.find((s) => s.toLowerCase() === name.toLowerCase());
  if (direct) return direct;
  const synKey = Object.keys(SKILL_SYNONYMS).find((k) => k.toLowerCase() === name.toLowerCase());
  if (synKey) return SKILL_SYNONYMS[synKey];
  return name; // si inconnu, on le laisse tel quel
}

// Map compétence -> caractéristique
const SKILL_ABILITY_MAP: Record<SkillName, keyof Record<string, number>> = {
  'Acrobaties': 'Dextérité',
  'Athlétisme': 'Force',
  'Arcanes': 'Intelligence',
  'Histoire': 'Intelligence',
  'Intuition': 'Sagesse',
  'Investigation': 'Intelligence',
  'Médecine': 'Sagesse',
  'Nature': 'Intelligence',
  'Perception': 'Sagesse',
  'Représentation': 'Charisme',
  'Persuasion': 'Charisme',
  'Tromperie': 'Charisme',
  'Intimidation': 'Charisme',
  'Escamotage': 'Dextérité',
  'Discrétion': 'Dextérité',
  'Survie': 'Sagesse',
  'Dressage': 'Sagesse',
  'Religion': 'Intelligence',
};

// Convertit ft -> m en arrondissant au 0,5 m (30 ft → 9 m)
const feetToMeters = (ft?: number) => {
  const n = Number(ft);
  if (!Number.isFinite(n)) return 9; // fallback raisonnable
  return Math.round(n * 0.3048 * 2) / 2;
};

export default function CharacterSummary({ 
  characterName, 
  onCharacterNameChange, 
  selectedRace, 
  selectedClass, 
  selectedBackground, 
  abilities, 
  onFinish, 
  onPrevious,
  selectedClassSkills = [],
  selectedBackgroundEquipmentOption = '',
}: CharacterSummaryProps) {
  const [nameError, setNameError] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Auto-masquer le toast après 4 secondes
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const raceData = races.find(r => r.name === selectedRace);
  const classData = classes.find(c => c.name === selectedClass);
  const backgroundData = backgrounds.find(b => b.name === selectedBackground);

  // Caracs finales = base + bonus historique déjà appliqués en amont
  // On ajoute ici les bonus raciaux
  const finalAbilities = useMemo(() => {
    const fa = { ...abilities };
    if (raceData?.abilityScoreIncrease) {
      Object.entries(raceData.abilityScoreIncrease).forEach(([ability, bonus]) => {
        if (fa[ability] != null) fa[ability] += bonus;
      });
    }
    return fa;
  }, [abilities, raceData]);

  const hitPoints = calculateHitPoints(finalAbilities['Constitution'] || 10, selectedClass);
  const armorClass = calculateArmorClass(finalAbilities['Dextérité'] || 10);
  const initiative = calculateModifier(finalAbilities['Dextérité'] || 10);

  // Maîtrises: union des compétences de classe sélectionnées + de l'historique
  const backgroundSkills = useMemo<string[]>(() => {
    const arr = backgroundData?.skillProficiencies ?? [];
    return Array.from(new Set(arr.map((s) => String(normalizeSkill(s)))));
  }, [backgroundData]);

  const proficientSet = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    selectedClassSkills.forEach((s) => set.add(String(normalizeSkill(s))));
    backgroundSkills.forEach((s) => set.add(String(normalizeSkill(s))));
    return set;
  }, [selectedClassSkills, backgroundSkills]);

  const proficiencyBonus = 2; // niveau 1

  // Équipement historique (si vous avez défini equipmentOptions dans backgrounds)
  const bgEquip =
    selectedBackgroundEquipmentOption === 'A'
      ? backgroundData?.equipmentOptions?.optionA ?? []
      : selectedBackgroundEquipmentOption === 'B'
        ? backgroundData?.equipmentOptions?.optionB ?? []
        : [];

  const handleFinish = () => {
    if (!characterName.trim()) {
      setNameError('Le nom du personnage est requis');
      setShowToast(true);
      
      // Faire défiler vers le haut pour montrer l'erreur
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
      return;
    }
    setNameError('');
    setShowToast(false);
    onFinish();
  };

  // Calcul du bonus de compétence
  const getSkillBonus = (skillLabel: SkillName): number => {
    const abilityKey = SKILL_ABILITY_MAP[skillLabel] || 'Dextérité';
    const score = finalAbilities[abilityKey] ?? 10;
    const mod = Math.floor((score - 10) / 2);
    const proficient = proficientSet.has(skillLabel);
    return mod + (proficient ? proficiencyBonus : 0);
  };

  return (
    <div className="wizard-step space-y-6 relative">
      {/* Toast d'erreur en bas à droite */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-red-900/90 border border-red-500/50 rounded-lg p-4 shadow-lg backdrop-blur-sm flex items-center gap-3 min-w-[300px]">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-100 text-sm">Le nom du personnage est requis</span>
            <button
              onClick={() => setShowToast(false)}
              className="text-red-300 hover:text-red-100 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Résumé de votre personnage</h2>
        <p className="text-gray-400">Vérifiez les détails avant de créer votre personnage</p>
      </div>

      <div className="max-w-md mx-auto">
        <Input
          label="Nom du personnage"
          value={characterName}
          onChange={(e) => onCharacterNameChange(e.target.value)}
          error={nameError}
          placeholder="Entrez le nom de votre personnage"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <User className="w-5 h-5 text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Informations de base</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Race:</span>
              <span className="text-white font-medium">{selectedRace}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Classe:</span>
              <span className="text-white font-medium">{selectedClass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Historique:</span>
              <span className="text-white font-medium">{selectedBackground}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Niveau:</span>
              <span className="text-white font-medium">1</span>
            </div>
            {/* Don d'historique supprimé ici */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Heart className="w-5 h-5 text-red-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Statistiques de combat</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Points de vie:</span>
              <span className="text-white font-medium">{hitPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Classe d'armure:</span>
              <span className="text-white font-medium">{armorClass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Initiative:</span>
              <span className="text-white font-medium">
                {initiative >= 0 ? '+' : ''}{initiative}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Vitesse:</span>
              <span className="text-white font-medium">{feetToMeters(raceData?.speed || 30)} m</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Caractéristiques</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(finalAbilities || {}).map(([ability, score]) => (
              <div key={ability} className="text-center">
                <div className="ability-score">
                  <div className="font-medium text-white text-sm">{ability}</div>
                  <div className="text-2xl font-bold text-white">{score}</div>
                  <div className="text-sm text-gray-400">
                    {calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Synthèse des compétences */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Star className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Compétences</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-gray-400 mb-3">
            Bonus de maîtrise: +{proficiencyBonus} | Maîtrises: classe + historique
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-4">
            {ALL_SKILLS.map((skill) => {
              const bonus = getSkillBonus(skill);
              const proficient = proficientSet.has(skill);
              const sign = bonus >= 0 ? '+' : '';
              return (
                <div key={skill} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {skill} {proficient && <span className="text-xs text-red-400">[M]</span>}
                  </span>
                  <span className="text-white font-medium">{sign}{bonus}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section Don d'historique */}
      {backgroundData?.feat && (
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <Scroll className="w-5 h-5 text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold text-white">Don d'historique</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Don acquis:</span>
              <span className="text-white font-medium">{backgroundData.feat}</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Accordé par l'historique {selectedBackground} - Voir chapitre 5 pour les détails
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Traits raciaux + espèce */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Traits</h3>
              </div>
              <div className="text-xs text-gray-400">
                Espèce: <span className="text-gray-200">{selectedRace}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-gray-300 text-sm space-y-1">
              {raceData?.traits?.map((trait, index) => (
                <li key={index}>• {trait}</li>
              )) || <li className="text-gray-500">Aucun trait disponible</li>}
            </ul>
          </CardContent>
        </Card>

        {/* Capacités de classe + classe choisie */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BookOpen className="w-5 h-5 text-green-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Capacités de classe</h3>
              </div>
              <div className="text-xs text-gray-400">
                Classe: <span className="text-gray-200">{selectedClass}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-gray-300 text-sm space-y-1">
              {classData?.features?.map((feature, index) => (
                <li key={index}>• {feature}</li>
              )) || <li className="text-gray-500">Aucune capacité de classe disponible</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Équipement de départ (classe + historique, si applicable) */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Package className="w-5 h-5 text-yellow-400 mr-2" />
            <h3 className="text-lg font-semibold text-white">Équipement de départ</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-white mb-2">De classe</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                {classData?.equipment?.map((item, i) => (
                  <li key={`class-eq-${i}`}>• {item}</li>
                )) || <li className="text-gray-500">—</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">
                D'historique {selectedBackgroundEquipmentOption ? `(Option ${selectedBackgroundEquipmentOption})` : ''}
              </h4>
              <ul className="text-gray-300 text-sm space-y-1">
                {bgEquip.length > 0
                  ? bgEquip.map((item, i) => <li key={`bg-eq-${i}`}>• {item}</li>)
                  : <li className="text-gray-500">Aucune option sélectionnée</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6">
        <Button
          onClick={onPrevious}
          variant="secondary"
          size="lg"
        >
          Précédent
        </Button>
        <Button
          onClick={handleFinish}
          size="lg"
          className="min-w-[200px]"
        >
          Créer le personnage
        </Button>
      </div>
    </div>
  );
}
