import React, { useState, useEffect } from 'react';
import { Dice6, Target, Sword, X, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DiceResult {
  die: number;
  result: number;
  isMax: boolean;
  isMin: boolean;
}

interface RollResult {
  dice: DiceResult[];
  modifier: number;
  total: number;
  type: 'attack' | 'damage';
  attackName: string;
}

interface DiceRollerProps {
  isOpen: boolean;
  onClose: () => void;
  rollData: {
    type: 'attack' | 'damage';
    attackName: string;
    diceFormula: string;
    modifier: number;
  } | null;
}

const parseDiceFormula = (formula: string): { count: number; sides: number }[] => {
  const dicePattern = /(\d+)d(\d+)/g;
  const dice: { count: number; sides: number }[] = [];
  let match;
  
  while ((match = dicePattern.exec(formula)) !== null) {
    dice.push({
      count: parseInt(match[1]),
      sides: parseInt(match[2])
    });
  }
  
  return dice;
};

const rollDie = (sides: number): number => {
  return Math.floor(Math.random() * sides) + 1;
};

const getDiceIcon = (sides: number) => {
  // Retourne une représentation textuelle du dé selon ses faces
  switch (sides) {
    case 4: return '🔺'; // Tétraèdre
    case 6: return '⚀'; // Cube
    case 8: return '🔸'; // Octaèdre
    case 10: return '🔟'; // Décaèdre
    case 12: return '🔷'; // Dodécaèdre
    case 20: return '🎲'; // Icosaèdre
    case 100: return '💯'; // Dé de pourcentage
    default: return '🎲';
  }
};

export function DiceRoller({ isOpen, onClose, rollData }: DiceRollerProps) {
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (isOpen && rollData) {
      performRoll();
    }
  }, [isOpen, rollData]);

  const performRoll = () => {
    if (!rollData) return;

    setIsRolling(true);
    setShowResult(false);

    // Animation delay
    setTimeout(() => {
      const diceGroups = parseDiceFormula(rollData.diceFormula);
      const allDice: DiceResult[] = [];

      diceGroups.forEach(({ count, sides }) => {
        for (let i = 0; i < count; i++) {
          const result = rollDie(sides);
          allDice.push({
            die: sides,
            result,
            isMax: result === sides,
            isMin: result === 1
          });
        }
      });

      const total = allDice.reduce((sum, die) => sum + die.result, 0) + rollData.modifier;

      setRollResult({
        dice: allDice,
        modifier: rollData.modifier,
        total,
        type: rollData.type,
        attackName: rollData.attackName
      });

      setIsRolling(false);
      setShowResult(true);
    }, 800);
  };

  const reroll = () => {
    setShowResult(false);
    performRoll();
  };

  if (!isOpen || !rollData) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl max-w-md w-full border border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {rollData.type === 'attack' ? (
                <Target className="w-6 h-6 text-blue-400" />
              ) : (
                <Sword className="w-6 h-6 text-red-400" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-100">
                  {rollData.type === 'attack' ? 'Jet d\'attaque' : 'Jet de dégâts'}
                </h3>
                <p className="text-sm text-gray-400">{rollData.attackName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Dice Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {rollData && (
                <div className={`text-6xl transition-all duration-300 ${
                  isRolling ? 'animate-spin' : ''
                }`}>
                  {getDiceIcon(parseDiceFormula(rollData.diceFormula)[0]?.sides || 20)}
                </div>
              )}
              {isRolling && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"></div>
              )}
            </div>
          </div>

          {/* Formula Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
              <span className="text-gray-300 font-mono">
                {rollData.diceFormula}
                {rollData.modifier !== 0 && (
                  <span className={rollData.modifier > 0 ? 'text-green-400' : 'text-red-400'}>
                    {rollData.modifier > 0 ? '+' : ''}{rollData.modifier}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Results */}
          {showResult && rollResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Individual Dice */}
              <div className="flex flex-wrap justify-center gap-2">
                {rollResult.dice.map((die, index) => (
                  <div
                    key={index}
                    className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                      die.isMax 
                        ? 'border-green-400 bg-green-400/20 text-green-400 shadow-lg shadow-green-400/20' 
                        : die.isMin 
                        ? 'border-red-400 bg-red-400/20 text-red-400 shadow-lg shadow-red-400/20'
                        : 'border-gray-600 bg-gray-700/50 text-gray-300'
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {die.result}
                  </div>
                ))}
              </div>

              {/* Calculation */}
              <div className="text-center space-y-2">
                <div className="text-sm text-gray-400">
                  {rollResult.dice.map(die => die.result).join(' + ')}
                  {rollResult.modifier !== 0 && (
                    <span className={rollResult.modifier > 0 ? 'text-green-400' : 'text-red-400'}>
                      {' '}{rollResult.modifier > 0 ? '+' : ''}{rollResult.modifier}
                    </span>
                  )}
                </div>
                
                {/* Total Result */}
                <div className={`text-4xl font-bold ${
                  rollData.type === 'attack' ? 'text-blue-400' : 'text-red-400'
                }`}>
                  {rollResult.total}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={reroll}
              disabled={isRolling}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Relancer
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}