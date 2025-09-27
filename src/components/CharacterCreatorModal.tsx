import React from 'react';
import { CharacterCreatorHost } from '../adapters/CharacterCreatorAdapter';
import { CharacterExportPayload } from '../types/characterCreator';

interface CharacterCreatorModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (payload: CharacterExportPayload) => void;
}

export const CharacterCreatorModal: React.FC<CharacterCreatorModalProps> = ({
  open,
  onClose,
  onComplete,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full h-full md:h-[92vh] md:w-[1100px] bg-gray-900 border border-gray-800 rounded-none md:rounded-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-gray-800/80 hover:bg-gray-700 text-white px-3 py-1 rounded"
          aria-label="Fermer"
        >
          Fermer
        </button>
        <div className="w-full h-full">
          <CharacterCreatorHost onComplete={onComplete} onCancel={onClose} />
        </div>
      </div>
    </div>
  );
}; 