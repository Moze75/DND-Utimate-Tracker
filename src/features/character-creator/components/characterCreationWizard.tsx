import React from 'react';
import { CharacterExportPayload } from '../../../types/characterCreator';

type Props = {
  onFinish: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
};

const CharacterCreationWizard: React.FC<Props> = ({ onFinish, onCancel }) => {
  return (
    <div className="w-full h-full p-6 flex flex-col items-center justify-center text-center text-gray-300">
      <h2 className="text-xl font-semibold mb-4">Assistant de création</h2>
      <p className="mb-6">Stub temporaire. Remplace ce composant par ton vrai wizard.</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          Annuler
        </button>
        <button
          onClick={() =>
            onFinish({
              characterName: 'Héros de Test',
              selectedRace: 'Humain',
              selectedClass: 'Guerrier',
              selectedBackground: 'Soldat',
              level: 1,
              finalAbilities: {
                Force: 16,
                Dextérité: 14,
                Constitution: 14,
                Intelligence: 10,
                Sagesse: 12,
                Charisme: 10,
              },
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
};

export default CharacterCreationWizard;