import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { Player, SpellSlots } from '../types/dnd';

interface SpellSlotSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (level: number) => void;
  player: Player;
  attackName: string;
  suggestedLevel: number;
}

export function SpellSlotSelectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  player, 
  attackName, 
  suggestedLevel 
}: SpellSlotSelectionModalProps) {
  const [selectedLevel, setSelectedLevel] = useState(suggestedLevel);

  const getAvailableSlots = (level: number): { max: number; used: number; available: number } => {
    if (!player.spell_slots) return { max: 0, used: 0, available: 0 };
    
    const levelKey = `level${level}` as keyof SpellSlots;
    const usedKey = `used${level}` as keyof SpellSlots;
    
    const max = player.spell_slots[levelKey] || 0;
    const used = player.spell_slots[usedKey] || 0;
    const available = Math.max(0, max - used);
    
    return { max, used, available };
  };

  // Obtenir seulement les niveaux avec des emplacements disponibles
  const getAvailableLevels = (): number[] => {
    const levels = [];
    for (let level = 1; level <= 9; level++) {
      const slots = getAvailableSlots(level);
      if (slots.available > 0) {
        levels.push(level);
      }
    }
    return levels;
  };

  const availableLevels = getAvailableLevels();

  // Si aucun niveau n'est disponible, fermer le modal
  React.useEffect(() => {
    if (availableLevels.length === 0) {
      onClose();
    } else if (!availableLevels.includes(selectedLevel)) {
      // Si le niveau suggéré n'est pas disponible, prendre le premier disponible
      setSelectedLevel(availableLevels[0]);
    }
  }, [availableLevels, selectedLevel, onClose]);

  // Move the conditional return after all hooks
  if (!isOpen) return null;

  const handleConfirm = () => {
    const slots = getAvailableSlots(selectedLevel);
    if (slots.available > 0) {
      onConfirm(selectedLevel);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl w-full max-w-sm max-h-[90vh] border border-gray-700/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-gray-700/50 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <div>
                <h3 className="text-base font-semibold text-gray-100">
                  Consommer un emplacement de sort
                </h3>
                <p className="text-sm text-gray-400">{attackName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-gray-300 mb-3 text-center text-sm">
            Choisissez le niveau d'emplacement de sort à consommer :
          </p>

          {/* Spell Slot Selection */}
          <div className="space-y-2 mb-4">
            {availableLevels.map(level => {
              const slots = getAvailableSlots(level);
              const isSelected = selectedLevel === level;

              return (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`w-full p-3 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-purple-500' : 'bg-gray-500'
                      }`} />
                      <span className="font-medium text-sm">Niveau {level}</span>
                      {level === suggestedLevel && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                          Suggéré
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      {slots.available} / {slots.max}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-4 border-t border-gray-700/50 flex-shrink-0">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 flex items-center justify-center gap-2 text-sm"
            >
              <Sparkles size={16} />
              Consommer l'emplacement
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}