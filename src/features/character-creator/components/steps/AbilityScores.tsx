import React, { useState, useEffect, useMemo } from 'react';
import Button from '../ui/Button';
import Card, { CardContent, CardHeader } from '../ui/Card';
import { calculateModifier, validatePointBuy, standardArray, rollAbilityScore, applyBackgroundBonuses } from '../../utils/dndCalculations';
import { Dice1, RotateCcw, Calculator } from 'lucide-react';
import type { DndBackground } from '../../types/character';

interface AbilityScoresProps {
  abilities: Record<string, number>; // scores de base (point buy / array / jets)
  onAbilitiesChange: (abilities: Record<string, number>) => void;
  onNext: () => void;
  onPrevious: () => void;

  // Nouveau: background sélectionné et callback facultatif pour remonter les scores finaux (base + background)
  selectedBackground?: DndBackground | null;
  onEffectiveAbilitiesChange?: (abilities: Record<string, number>) => void;
}

const abilityNames = ['Force', 'Dextérité', 'Constitution', 'Intelligence', 'Sagesse', 'Charisme'];

export default function AbilityScores({
  abilities,
  onAbilitiesChange,
  onNext,
  onPrevious,
  selectedBackground = null,
  onEffectiveAbilitiesChange
}: AbilityScoresProps) {
  const [method, setMethod] = useState<'pointbuy' | 'array' | 'roll'>('pointbuy');
  const [rolledScores, setRolledScores] = useState<number[]>([]);
  const [assignedScores, setAssignedScores] = useState<Record<string, number>>({});

  // Nouveau: état pour les bonus d'historique
  const [bgMode, setBgMode] = useState<'twoPlusOne' | 'oneOneOne'>('twoPlusOne');
  const [bgAssignments, setBgAssignments] = useState<{ plusTwo?: string; plusOne?: string }>({});

  // Recalcul des scores finaux (base + bonus background)
  const effectiveAbilities = useMemo(() => {
    if (!selectedBackground) return abilities;
    return applyBackgroundBonuses(abilities, selectedBackground.abilityScores, bgMode, bgAssignments);
  }, [abilities, selectedBackground, bgMode, bgAssignments]);

  // Remonter les scores finaux si demandé
  useEffect(() => {
    onEffectiveAbilitiesChange?.(effectiveAbilities);
  }, [effectiveAbilities, onEffectiveAbilitiesChange]);

  // Reset des affectations quand on change de background ou de mode
  useEffect(() => {
    setBgAssignments({});
  }, [selectedBackground, bgMode]);

  useEffect(() => {
    if (method === 'pointbuy') {
      const defaultScores = abilityNames.reduce((acc, ability) => {
        acc[ability] = 8;
        return acc;
      }, {} as Record<string, number>);
      onAbilitiesChange(defaultScores);
    } else if (method === 'array') {
      setAssignedScores({});
      onAbilitiesChange({});
    } else if (method === 'roll') {
      rollAllAbilities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  const rollAllAbilities = () => {
    const newScores = Array.from({ length: 6 }, () => rollAbilityScore());
    setRolledScores(newScores);
    setAssignedScores({});
    onAbilitiesChange({});
  };

  const handlePointBuyChange = (ability: string, value: number) => {
    const newAbilities = { ...abilities, [ability]: value };
    onAbilitiesChange(newAbilities);
  };

  const assignScore = (ability: string, scoreIndex: number) => {
    if (method === 'array') {
      const newAssigned = { ...assignedScores };
      
      // Remove previous assignment of this ability
      Object.keys(newAssigned).forEach(key => {
        if (newAssigned[key] === scoreIndex) {
          delete newAssigned[key];
        }
      });
      
      // Remove previous assignment of this score
      if (newAssigned[ability] !== undefined) {
        delete newAssigned[ability];
      }
      
      newAssigned[ability] = scoreIndex;
      setAssignedScores(newAssigned);
      
      const newAbilities = { ...abilities };
      newAbilities[ability] = standardArray[scoreIndex];
      onAbilitiesChange(newAbilities);
    } else if (method === 'roll') {
      const newAssigned = { ...assignedScores };
      
      // Remove previous assignments
      Object.keys(newAssigned).forEach(key => {
        if (newAssigned[key] === scoreIndex) {
          delete newAssigned[key];
        }
      });
      
      if (newAssigned[ability] !== undefined) {
        delete newAssigned[ability];
      }
      
      newAssigned[ability] = scoreIndex;
      setAssignedScores(newAssigned);
      
      const newAbilities = { ...abilities };
      newAbilities[ability] = rolledScores[scoreIndex];
      onAbilitiesChange(newAbilities);
    }
  };

  const pointBuyValidation = method === 'pointbuy' ? validatePointBuy(abilities) : { valid: true, pointsUsed: 0, errors: [] };
  const isArrayComplete = method === 'array' && Object.keys(assignedScores).length === 6;
  const isRollComplete = method === 'roll' && Object.keys(assignedScores).length === 6;

  // Validation background: si un background est sélectionné et que le mode est +2/+1,
  // il faut que les deux attributions soient faites et différentes.
  const isBackgroundComplete =
    !selectedBackground
      ? true
      : (bgMode === 'oneOneOne' || (!!bgAssignments.plusTwo && !!bgAssignments.plusOne && bgAssignments.plusTwo !== bgAssignments.plusOne));

  const canProceed =
    ((method === 'pointbuy' && pointBuyValidation.valid) || isArrayComplete || isRollComplete) && isBackgroundComplete;

  // Helper pour afficher le bonus appliqué à une carac
  const getBackgroundBonusFor = (ability: string) => {
    const base = abilities[ability] ?? 8;
    const eff = effectiveAbilities[ability] ?? base;
    return eff - base;
  };

  return (
    <div className="wizard-step space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Déterminez vos caractéristiques</h2>
        <p className="text-gray-400">Choisissez votre méthode de génération des scores</p>
      </div>

      <div className="flex justify-center space-x-4 mb-6">
        <Button
          variant={method === 'pointbuy' ? 'primary' : 'secondary'}
          onClick={() => setMethod('pointbuy')}
          size="sm"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Point Buy
        </Button>
        <Button
          variant={method === 'array' ? 'primary' : 'secondary'}
          onClick={() => setMethod('array')}
          size="sm"
        >
          Tableau standard
        </Button>
        <Button
          variant={method === 'roll' ? 'primary' : 'secondary'}
          onClick={() => setMethod('roll')}
          size="sm"
        >
          <Dice1 className="w-4 h-4 mr-2" />
          Lancer de dés
        </Button>
      </div>

      {method === 'pointbuy' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Point Buy System</h3>
              <div className="text-sm text-gray-400">
                Points utilisés: {pointBuyValidation.pointsUsed}/27
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {abilityNames.map((ability) => {
                const baseVal = abilities[ability] ?? 8;
                const effVal = effectiveAbilities[ability] ?? baseVal;
                const bonus = effVal - baseVal;
                const effMod = calculateModifier(effVal);

                return (
                  <div key={ability} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">{ability}</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="8"
                        max="15"
                        value={baseVal}
                        onChange={(e) => handlePointBuyChange(ability, parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="w-24 text-center">
                        <span className="text-lg font-bold text-white">{effVal}</span>
                        <div className="text-xs text-gray-400">
                          {effMod >= 0 ? '+' : ''}{effMod}
                        </div>
                        {selectedBackground && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            Base: {baseVal}{' '}
                            {bonus !== 0 && (
                              <span className={bonus > 0 ? 'text-green-400' : 'text-red-400'}>
                                ({bonus > 0 ? `+${bonus}` : bonus})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {pointBuyValidation.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
                <ul className="text-red-400 text-sm space-y-1">
                  {pointBuyValidation.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {method === 'array' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Tableau Standard</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-4">
                {standardArray.map((score, index) => (
                  <div
                    key={index}
                    className={`text-center py-2 rounded-lg border-2 transition-colors ${
                      Object.values(assignedScores).includes(index)
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    <div className="text-lg font-bold text-white">{score}</div>
                    <div className="text-xs text-gray-400">
                      {calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {abilityNames.map((ability) => (
                  <div key={ability} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">{ability}</label>
                    <select
                      value={assignedScores[ability] !== undefined ? assignedScores[ability] : ''}
                      onChange={(e) => e.target.value && assignScore(ability, parseInt(e.target.value))}
                      className="input-dark w-full"
                    >
                      <option value="">Sélectionner...</option>
                      {standardArray.map((score, index) => (
                        <option
                          key={index}
                          value={index}
                          disabled={Object.values(assignedScores).includes(index)}
                        >
                          {score} ({calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {method === 'roll' && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Lancer de dés (4d6, garder les 3 meilleurs)</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={rollAllAbilities}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Relancer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 mb-4">
                {rolledScores.map((score, index) => (
                  <div
                    key={index}
                    className={`text-center py-2 rounded-lg border-2 transition-colors ${
                      Object.values(assignedScores).includes(index)
                        ? 'border-red-500 bg-red-900/20'
                        : 'border-gray-600 bg-gray-800'
                    }`}
                  >
                    <div className="text-lg font-bold text-white">{score}</div>
                    <div className="text-xs text-gray-400">
                      {calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {abilityNames.map((ability) => (
                  <div key={ability} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">{ability}</label>
                    <select
                      value={assignedScores[ability] !== undefined ? assignedScores[ability] : ''}
                      onChange={(e) => e.target.value && assignScore(ability, parseInt(e.target.value))}
                      className="input-dark w-full"
                    >
                      <option value="">Sélectionner...</option>
                      {rolledScores.map((score, index) => (
                        <option
                          key={index}
                          value={index}
                          disabled={Object.values(assignedScores).includes(index)}
                        >
                          {score} ({calculateModifier(score) >= 0 ? '+' : ''}{calculateModifier(score)})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajustements issus de l'historique */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Ajustements d'historique</h3>
            {selectedBackground ? (
              <span className="text-sm text-gray-400">Historique: {selectedBackground.name}</span>
            ) : (
              <span className="text-sm text-gray-500">Aucun historique sélectionné</span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedBackground ? (
            <p className="text-gray-400 text-sm">
              Sélectionnez un historique pour appliquer des bonus aux caractéristiques.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button
                  variant={bgMode === 'twoPlusOne' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setBgMode('twoPlusOne')}
                >
                  +2 et +1 (deux caracs différentes)
                </Button>
                <Button
                  variant={bgMode === 'oneOneOne' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setBgMode('oneOneOne')}
                >
                  +1 +1 +1 (sur les 3 caracs de l'historique)
                </Button>
              </div>

              <div className="text-xs text-gray-400">
                Caractéristiques autorisées par l'historique:&nbsp;
                <span className="text-gray-300">
                  {selectedBackground.abilityScores.join(' • ')}
                </span>
              </div>

              {bgMode === 'twoPlusOne' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">+2 à</label>
                    <select
                      className="input-dark w-full"
                      value={bgAssignments.plusTwo ?? ''}
                      onChange={(e) =>
                        setBgAssignments((prev) => ({ ...prev, plusTwo: e.target.value || undefined }))
                      }
                    >
                      <option value="">Sélectionner...</option>
                      {selectedBackground.abilityScores.map((a) => (
                        <option
                          key={a}
                          value={a}
                          disabled={bgAssignments.plusOne === a}
                        >
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">+1 à</label>
                    <select
                      className="input-dark w-full"
                      value={bgAssignments.plusOne ?? ''}
                      onChange={(e) =>
                        setBgAssignments((prev) => ({ ...prev, plusOne: e.target.value || undefined }))
                      }
                    >
                      <option value="">Sélectionner...</option>
                      {selectedBackground.abilityScores.map((a) => (
                        <option
                          key={a}
                          value={a}
                          disabled={bgAssignments.plusTwo === a}
                        >
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-gray-800 border border-gray-700 text-sm text-gray-300">
                  +1 s’applique automatiquement à chacune de: {selectedBackground.abilityScores.join(', ')}.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aperçu des scores finaux (base + background) */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-white">Aperçu des scores finaux</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {abilityNames.map((ability) => {
              const baseVal = abilities[ability] ?? 8;
              const effVal = effectiveAbilities[ability] ?? baseVal;
              const bonus = effVal - baseVal;
              const mod = calculateModifier(effVal);

              return (
                <div key={ability} className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-400">{ability}</span>
                    <span className="text-xs text-gray-500">Mod: {mod >= 0 ? `+${mod}` : mod}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xl font-bold text-white">{effVal}</span>
                    <span className="text-xs text-gray-400">
                      Base: {baseVal}{' '}
                      {bonus !== 0 && (
                        <span className={bonus > 0 ? 'text-green-400' : 'text-red-400'}>
                          ({bonus > 0 ? `+${bonus}` : bonus})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {!isBackgroundComplete && (
            <div className="mt-3 text-sm text-yellow-300">
              Assignez vos bonus (+2 et +1) sur deux caractéristiques différentes pour continuer.
            </div>
          )}
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
          onClick={onNext}
          disabled={!canProceed}
          size="lg"
          className="min-w-[200px]"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}