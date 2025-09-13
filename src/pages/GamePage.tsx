import React, { useState, useEffect, useCallback } from 'react';
import { supabase, testConnection } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Player } from '../types/dnd';
import { LogOut } from 'lucide-react';
import { PlayerProfile } from '../components/PlayerProfile';
import { TabNavigation } from '../components/TabNavigation';
import CombatTab from '../components/CombatTab';
import { EquipmentTab } from '../components/EquipmentTab';
import { AbilitiesTab } from '../components/AbilitiesTab';
import { StatsTab } from '../components/StatsTab';
import { ClassesTab } from '../components/ClassesTab';
import { PlayerContext } from '../contexts/PlayerContext';

// Services (certains peuvent être inutilisés selon ta page)
import { playerService } from '../services/playerService';
import { inventoryService } from '../services/inventoryService';
import { authService } from '../services/authService';

type Currency = 'gold' | 'silver' | 'copper';
type Money = Record<Currency, number>;

interface GamePageProps {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
  // Devient optionnel: la page ne crashe plus si le parent ne le fournit pas
  onUpdateCharacter?: (player: Player) => void;
}

export function GamePage({ session, selectedCharacter, onBackToSelection, onUpdateCharacter }: GamePageProps) {
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(selectedCharacter);
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('combat');

  // Helper central: met à jour l'état local et, si dispo, remonte au parent
  const applyPlayerUpdate = useCallback((updatedPlayer: Player) => {
    setCurrentPlayer(updatedPlayer);
    if (typeof onUpdateCharacter === 'function') {
      try {
        onUpdateCharacter(updatedPlayer);
      } catch (e) {
        // On ne casse pas l'UI si le parent jette
        console.warn('[GamePage] onUpdateCharacter a levé une erreur:', e);
      }
    }
  }, [onUpdateCharacter]);

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setConnectionError(null);

        const isConnected = await testConnection();
        if (!isConnected.success) {
          throw new Error('Impossible de se connecter à la base de données');
        }

        // Important: ne pas écraser currentPlayer si on reste sur le même personnage
        setCurrentPlayer(prev => {
          if (!prev || prev.id !== selectedCharacter.id) return selectedCharacter;
          return prev;
        });

        const inventoryData = await inventoryService.getPlayerInventory(selectedCharacter.id);
        setInventory(inventoryData);

        setLoading(false);
      } catch (error: any) {
        console.error("Erreur d'initialisation:", error);
        setConnectionError(error.message);
        setLoading(false);
      }
    };

    // Ne redéclenche que si l'identité du perso change (évite des resets visuels)
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, selectedCharacter.id]);

  // Abonnement temps réel: si le joueur est mis à jour en base (ex: ressources de classe),
  // on met à jour l'état local et on notifie le parent.
  useEffect(() => {
    if (!currentPlayer?.id) return;

    const channel = supabase
      .channel(`player:${currentPlayer.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${currentPlayer.id}` },
        (payload) => {
          try {
            const next = payload.new as Player;
            // Sécurité: ne remonte que si c'est bien la même entité
            if (next?.id === currentPlayer.id) {
              applyPlayerUpdate(next);
            }
          } catch (e) {
            console.warn('[GamePage] realtime payload parsing error:', e);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Optionnel: debug
          // console.log('[GamePage] realtime subscribed for player', currentPlayer.id);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPlayer?.id, applyPlayerUpdate]);

  const handleSignOut = async () => {
    try {
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
              toast.loading('Tentative de reconnexion...');
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
          <>
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
          </>
        )}
      </div>

      <div className="w-full max-w-md mx-auto mt-6 px-4">
        <button
          onClick={handleSignOut}
          className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Retour aux personnages
        </button>
      </div>
    </div>
  );
}