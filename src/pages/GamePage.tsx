import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';

import { testConnection } from '../lib/supabase';
import { Player } from '../types/dnd';

import { PlayerProfile } from '../components/PlayerProfile';
import { TabNavigation } from '../components/TabNavigation';
import CombatTab from '../components/CombatTab';
import { EquipmentTab } from '../components/EquipmentTab';
import { AbilitiesTab } from '../components/AbilitiesTab';
import { StatsTab } from '../components/StatsTab';
import { ClassesTab } from '../components/ClassesTab';
import { PlayerContext } from '../contexts/PlayerContext';

import { inventoryService } from '../services/inventoryService';
import { authService } from '../services/authService';

const LAST_SELECTED_CHARACTER_ID = 'ut:lastCharacterId';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class';

interface GamePageProps {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
}

export function GamePage({ session, selectedCharacter, onBackToSelection }: GamePageProps) {
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Source de vérité locale pour le joueur courant (évite les "sauts" d'UI)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(selectedCharacter);

  const [inventory, setInventory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('combat');

  // Mémoriser le dernier personnage (auto-resume côté App)
  useEffect(() => {
    if (selectedCharacter?.id) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_ID, selectedCharacter.id);
        // Si on sortait volontairement vers la sélection juste avant, on annule ce "skip"
        sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
      } catch {
        // stockage non critique
      }
    }
  }, [selectedCharacter?.id]);

  // Centralise la mise à jour locale du joueur (pas de remontée immédiate au parent)
  const applyPlayerUpdate = useCallback((updatedPlayer: Player) => {
    setCurrentPlayer(updatedPlayer);
  }, []);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setConnectionError(null);

      const isConnected = await testConnection();
      if (!isConnected.success) {
        throw new Error('Impossible de se connecter à la base de données');
      }

      // Ne pas écraser l'état si on reste sur le même personnage
      setCurrentPlayer(prev => (prev && prev.id === selectedCharacter.id ? prev : selectedCharacter));

      const inventoryData = await inventoryService.getPlayerInventory(selectedCharacter.id);
      setInventory(inventoryData);

      setLoading(false);
    } catch (error: any) {
      console.error('Erreur d\'initialisation:', error);
      setConnectionError(error.message ?? 'Erreur inconnue');
      setLoading(false);
    }
  }, [selectedCharacter.id, selectedCharacter, session]);

  useEffect(() => {
    // Dépend uniquement de l'ID pour éviter les réinits lors de micro-mises à jour
    initialize();
  }, [initialize]);

  const handleBackToSelection = async () => {
    try {
      // Empêche l'auto-resume immédiat quand on revient volontairement à la sélection
      sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');

      if (onBackToSelection) {
        onBackToSelection();
        toast.success('Retour à la sélection des personnages');
      } else {
        await authService.signOut();
        toast.success('Déconnexion réussie');
      }
    } catch (error: any) {
      console.error('Erreur lors du retour à la sélection:', error);
      toast.error('Erreur lors du retour à la sélection');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 stat-card p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Erreur de connexion</h2>
            <p className="text-gray-300 mb-4">{connectionError}</p>
            <p className="text-sm text-gray-400 mb-4">
              Vérifiez votre connexion Internet et réessayez.
            </p>
          </div>
          <button
            onClick={() => {
              setConnectionError(null);
              initialize();
            }}
            className="w-full btn-primary px-4 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile
              player={currentPlayer}
              onUpdate={applyPlayerUpdate}
            />

            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {activeTab === 'combat' && (
              <CombatTab
                player={currentPlayer}
                onUpdate={applyPlayerUpdate}
              />
            )}

            {activeTab === 'abilities' && (
              <AbilitiesTab
                player={currentPlayer}
                onUpdate={applyPlayerUpdate}
              />
            )}

            {activeTab === 'stats' && (
              <StatsTab
                player={currentPlayer}
                onUpdate={applyPlayerUpdate}
              />
            )}

            {activeTab === 'equipment' && (
              <EquipmentTab
                player={currentPlayer}
                inventory={inventory}
                onPlayerUpdate={applyPlayerUpdate}
                onInventoryUpdate={setInventory}
              />
            )}

            {activeTab === 'class' && (
              <ClassesTab
                player={currentPlayer}
                onUpdate={applyPlayerUpdate}
              />
            )}
          </PlayerContext.Provider>
        )}
      </div>

      <div className="w-full max-w-md mx-auto mt-6 px-4">
        <button
          onClick={handleBackToSelection}
          className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Retour aux personnages
        </button>
      </div>
    </div>
  );
}

export default GamePage;