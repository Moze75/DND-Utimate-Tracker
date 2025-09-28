import React, { useState, useMemo } from 'react';
import { classes } from '../../data/classes';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { Sword, Heart, Shield, Zap, BookOpen, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { DndClass } from '../../types/character';
import { normalizeSkill } from '../../data/skills';
import { getClassImageUrl } from '../../utils/classImages';

interface ClassSelectionProps {
  selectedClass: DndClass | '';
  onClassSelect: (dndClass: DndClass) => void;
  onNext: () => void;
  onPrevious: () => void;

  // Rendez-les bien présents depuis le Wizard pour que les clics aient un effet
  selectedSkills?: string[];
  onSelectedSkillsChange?: (skills: string[]) => void;
}

const ClassSelection: React.FC<ClassSelectionProps> = ({
  selectedClass,
  onClassSelect,
  onNext,
  onPrevious,
  selectedSkills = [],
  onSelectedSkillsChange = () => {},
}) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const selectedClassData = useMemo(
    () => classes.find((c) => c.name === selectedClass),
    [selectedClass]
  );

  const handleClick = (className: DndClass) => {
    onClassSelect(className);
    setExpanded((prev) => (prev === className ? null : className));
  };

  const getClassIcon = (className: DndClass) => {
    const iconMap: Record<DndClass, React.ReactNode> = {
      'Guerrier': <Sword className="w-5 h-5 text-red-400" />,
      'Magicien': <BookOpen className="w-5 h-5 text-blue-400" />,
      'Roublard': <Zap className="w-5 h-5 text-purple-400" />,
      'Clerc': <Shield className="w-5 h-5 text-yellow-400" />,
      'Rôdeur': <Sword className="w-5 h-5 text-green-400" />,
      'Barbare': <Heart className="w-5 h-5 text-red-500" />,
      'Barde': <BookOpen className="w-5 h-5 text-pink-400" />,
      'Druide': <Shield className="w-5 h-5 text-green-500" />,
      'Moine': <Zap className="w-5 h-5 text-orange-400" />,
      'Paladin': <Shield className="w-5 h-5 text-blue-500" />,
      'Ensorceleur': <Zap className="w-5 h-5 text-purple-500" />,
      'Occultiste': <BookOpen className="w-5 h-5 text-purple-600" />
    };
    return iconMap[className] || <Sword className="w-5 h-5 text-gray-400" />;
  };

  const toggleSkill = (rawSkill: string, limit: number) => {
    const skill = normalizeSkill(rawSkill);
    const set = new Set(selectedSkills);
    const already = set.has(skill);

    if (already) {
      set.delete(skill);
      onSelectedSkillsChange(Array.from(set));
      return;
    }

    // Ne pas dépasser la limite
    if ((selectedSkills?.length || 0) >= limit) return;

    set.add(skill);
    onSelectedSkillsChange(Array.from(set));
  };

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre classe</h2>
        <p className="text-gray-400">Votre classe détermine vos capacités et votre rôle dans l'aventure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => {
          const isSelected = selectedClass === cls.name;
          const isExpanded = expanded === cls.name;
          const imageSrc = getClassImageUrl(cls.name); // OK: cls est dans le scope

          const limit = cls.skillsToChoose ?? 0;
          const chosenCount = isSelected ? (selectedSkills?.length || 0) : 0;

          return (
            <Card
              key={cls.name}
              selected={isSelected}
              onClick={() => handleClick(cls.name)}
              className="h-full"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{cls.name}</h3>
                  <div className="flex items-center gap-2">
                    {getClassIcon(cls.name)}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">{cls.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-400">
                    <Heart className="w-4 h-4 mr-2 text-red-400" />
                    <span>Dé de vie: d{cls.hitDie}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                    <span>Capacité principale: {cls.primaryAbility.join(', ')}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    <span>Jets de sauvegarde: {cls.savingThrows.join(', ')}</span>
                  </div>
                </div>

                {/* Déplié */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gray-700/50 pt-4 animate-fade-in">
                    {/* Image fluide */}
                    {imageSrc && (
                      <div className="mb-4">
                        <img
                          src={imageSrc}
                          alt={cls.name}
                          className="block w-full h-auto rounded-md border border-gray-700/60"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Choix des compétences */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">Compétences disponibles</h4>
                        <span className="text-xs text-gray-400">
                          {isSelected ? chosenCount : 0}/{limit} sélectionnées
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(cls.availableSkills ?? []).map((raw, idx) => {
                          const label = normalizeSkill(raw);
                          const canToggle = isSelected; // on ne coche que sur la classe sélectionnée
                          const isChecked = isSelected && selectedSkills?.includes(label);
                          const disableCheck =
                            !canToggle ||
                            (!isChecked && (selectedSkills?.length || 0) >= limit);

                          return (
                            <button
                              type="button"
                              key={`${raw}-${idx}`}
                              className={`flex items-center justify-start gap-2 px-3 py-2 rounded-md border text-left ${
                                isChecked
                                  ? 'border-red-500/60 bg-red-900/20 text-gray-100'
                                  : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800'
                              } ${disableCheck ? 'opacity-60 cursor-not-allowed' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!disableCheck) toggleSkill(raw, limit);
                              }}
                              aria-disabled={disableCheck}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-red-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400 shrink-0" />
                              )}
                              <span className="text-sm">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Équipement */}
                    <div className="mb-4">
                      <h4 className="font-medium text-white mb-2">Équipement de départ</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        {(cls.equipment ?? []).map((item, index) => (
                          <li key={index}>• {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Capacités de classe */}
                    {Array.isArray(cls.features) && cls.features.length > 0 && (
                      <div>
                        <h4 className="font-medium text-white mb-2">Capacités de classe (niveau 1)</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                          {cls.features.map((feat, index) => (
                            <li key={index}>• {feat}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-6">
        <Button
          onClick={onPrevious}
          variant="secondary"
          size="lg"
        >
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedClass}
          size="lg"
          className="min-w-[200px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
};

export default ClassSelection;