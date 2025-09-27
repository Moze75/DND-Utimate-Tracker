import React, { Suspense } from 'react';
import { CharacterExportPayload } from '../types/characterCreator';

// Import dynamique du wizard copié en local pour du code-splitting
const CreatorApp = React.lazy(() =>
  import('../features/character-creator/CreatorApp').then(m => ({ default: m.CreatorApp }))
);

export interface CharacterCreatorHostProps {
  onComplete: (payload: CharacterExportPayload) => void;
  onCancel: () => void;
}

export function CharacterCreatorHost({ onComplete, onCancel }: CharacterCreatorHostProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          Chargement de l’assistant de création...
        </div>
      }
    >
      <CreatorApp onComplete={onComplete} onCancel={onCancel} />
    </Suspense>
  );
} 