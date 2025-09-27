import React, { useState } from 'react';
import { backgrounds } from '../../data/backgrounds';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import { BookOpen, Star, Wrench, Zap, ChevronDown, CheckCircle2, Circle } from 'lucide-react';

interface BackgroundSelectionProps {
  selectedBackground: string;
  onBackgroundSelect: (background: string) => void;

  // Rendus optionnels pour éviter les erreurs si non encore branchés depuis le Wizard
  selectedEquipmentOption?: 'A' | 'B' | '';
  onEquipmentOptionChange?: (opt: 'A' | 'B' | '') => void;

  onNext: () => void;
  onPrevious: () => void;
}

export default function BackgroundSelection({
  selectedBackground,
  onBackgroundSelect,
  selectedEquipmentOption = '',          // fallback sûr
  onEquipmentOptionChange = () => {},    // no-op sûr
  onNext,
  onPrevious
}: BackgroundSelectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleClick = (name: string) => {
    const isSame = selectedBackground === name;
    onBackgroundSelect(name);
    setExpanded((prev) => (prev === name ? null : name));
    if (!isSame) {
      // reset le choix d’équipement si on change d’historique
      onEquipmentOptionChange('');
    }
  };

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre historique</h2>
        <p className="text-gray-400">Votre historique reflète votre passé et vos talents acquis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backgrounds.map((bg) => {
          const isSelected = selectedBackground === bg.name;
          const isExpanded = expanded === bg.name;

          return (
            <Card
              key={bg.name}
              selected={isSelected}
              onClick={() => handleClick(bg.name)}
              className="h-full"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{bg.name}</h3>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-400" />
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 text-sm mb-3">{bg.description}</p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-400" />
                    <span>Compétences: {bg.skillProficiencies?.join(', ') || '—'}</span>
                  </div>
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 mr-2 text-green-400" />
                    <span>Outils: {bg.toolProficiencies?.join(', ') || '—'}</span>
                  </div>
                  {bg.abilityScores && (
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-2 text-red-400" />
                      <span>Caractéristiques clés: {bg.abilityScores.join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Détails dépliés dans la carte */}
                {isExpanded && (
                  <div className="mt-4 border-t border-gray-700/50 pt-4 animate-fade-in">
                    {/* Sélecteur d’option d’équipement A/B */}
                    {bg.equipmentOptions && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-white">Équipement de départ</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option A */}
                          <button
                            type="button"
                            className={`text-left rounded-md border p-3 transition-colors ${
                              selectedEquipmentOption === 'A'
                                ? 'border-red-500/70 bg-red-900/20'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEquipmentOptionChange('A');
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {selectedEquipmentOption === 'A' ? (
                                <CheckCircle2 className="w-4 h-4 text-red-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-200">Option A</span>
                            </div>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {bg.equipmentOptions.optionA.map((item, i) => (
                                <li key={`A-${i}`}>• {item}</li>
                              ))}
                            </ul>
                          </button>

                          {/* Option B */}
                          <button
                            type="button"
                            className={`text-left rounded-md border p-3 transition-colors ${
                              selectedEquipmentOption === 'B'
                                ? 'border-red-500/70 bg-red-900/20'
                                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEquipmentOptionChange('B');
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {selectedEquipmentOption === 'B' ? (
                                <CheckCircle2 className="w-4 h-4 text-red-400" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-200">Option B</span>
                            </div>
                            <ul className="text-gray-300 text-sm space-y-1">
                              {bg.equipmentOptions.optionB.map((item, i) => (
                                <li key={`B-${i}`}>• {item}</li>
                              ))}
                            </ul>
                          </button>
                        </div>
                        <div className="text-xs text-gray-400">
                          Choisissez une option pour continuer.
                        </div>
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
        <Button onClick={onPrevious} variant="secondary" size="lg">
          Précédent
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedBackground || !selectedEquipmentOption}
          size="lg"
          className="min-w-[200px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}