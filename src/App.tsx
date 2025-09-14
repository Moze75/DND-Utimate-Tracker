import React, { useEffect, useState } from 'react';
import GamePage from './pages/GamePage';
import CharacterSelectionPage from './pages/CharacterSelectionPage';
import { Player } from './types/dnd';
import { playerService } from './services/playerService';

const LAST_SELECTED_CHARACTER_ID = 'ut:lastCharacterId';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);

  // Helper robuste pour récupérer un joueur par ID, en s'adaptant aux méthodes disponibles
  const fetchPlayerById = async (id: string): Promise<Player | null> => {
    const svc: any = playerService as any;
    try {
      if (svc?.getPlayerById) return await svc.getPlayerById(id);
      if (svc?.getById) return await svc.getById(id);
      if (svc?.findById) return await svc.findById(id);
      if (svc?.get) return await svc.get(id);
      return null;
    } catch {
      return null;
    }
  };

  // Auto-resume du dernier personnage si aucun n'est sélectionné
  useEffect(() => {
    if (selectedCharacter) return;

    // Respecter le choix utilisateur de rester sur l'écran de sélection (flag one-shot)
    if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
      return;
    }

    const lastId = localStorage.getItem(LAST_SELECTED_CHARACTER_ID);
    if (!lastId) return;

    let cancelled = false;

    (async () => {
      const player = await fetchPlayerById(lastId);
      if (cancelled) return;
      if (player) {
        setSelectedCharacter(player);
      } else {
        // ID obsolète => nettoyage
        localStorage.removeItem(LAST_SELECTED_CHARACTER_ID);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCharacter]);

  const handleSelectCharacter = (player: Player) => {
    try {
      localStorage.setItem(LAST_SELECTED_CHARACTER_ID, player.id);
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
    } catch {
      // stockage non critique
    }
    setSelectedCharacter(player);
  };

  const handleBackToSelection = () => {
    // Empêche l'auto-resume immédiatement après être revenu volontairement sur la sélection
    sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    setSelectedCharacter(null);
  };

  if (selectedCharacter) {
    return (
      <GamePage
        selectedCharacter={selectedCharacter}
        onBackToSelection={handleBackToSelection}
      />
    );
  }

  return <CharacterSelectionPage onSelect={handleSelectCharacter} />;
}