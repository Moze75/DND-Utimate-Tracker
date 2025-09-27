import React from 'react';
import { CharacterExportPayload } from '../types/characterCreator';

export interface CharacterCreatorHostProps {
  onComplete: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
}

// Remplacez ce host par l’import réel du wizard de @Moze75/Character_Creator_base
// Exemple: import { CharacterCreatorApp } from '@moze75/character-creator-base';
export function CharacterCreatorHost({ onComplete, onCancel }: CharacterCreatorHostProps) {
  return (
    <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center text-gray-300">
      <p className="mb-4">
        Assistant de création non encore branché. Remplacez CharacterCreatorHost par l’export réel.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">
          Annuler
        </button>
        <button
          onClick={() =>
            onComplete({
              characterName: 'Héros de Test',
              selectedRace: 'Humain',
              selectedClass: 'Guerrier',
              selectedBackground: 'Soldat',
              level: 1,
              finalAbilities: { Force: 16, Dextérité: 14, Constitution: 14, Intelligence: 10, Sagesse: 12, Charisme: 10 },
              proficientSkills: ['Athlétisme', 'Perception'],
              equipment: ['Épée longue', 'Bouclier', 'Armure de cuir'],
              selectedBackgroundEquipmentOption: 'A',
              hitPoints: 12,
              armorClass: 16,
              initiative: 2,
              speed: 30,
            })
          }
          className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 text-white"
        >
          Simuler un export
        </button>
      </div>
    </div>
  );
}