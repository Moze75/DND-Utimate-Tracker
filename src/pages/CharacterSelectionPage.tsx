import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Player } from '../types/dnd';
import {
  LogOut,
  Plus,
  User,
  Sword,
  Shield,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { authService } from '../services/authService';

interface CharacterSelectionPageProps {
  session: any;
  onCharacterSelect: (player: Player) => void;
}

/ 1) Configure l’URL du fond ici (ou via .env VITE_SELECTION_BG_URL)
const BG_URL =
  (import.meta as any)?.env?.VITE_SELECTION_BG_URL ||
  'https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static/tmpoofee5sh.png';

export function CharacterSelectionPage({ session, onCharacterSelect }: CharacterSelectionPageProps) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [creating, setCreating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [deletingCharacter, setDeletingCharacter] = useState<Player | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  useEffect(() => {
    fetchPlayers();
    runDiagnostic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const runDiagnostic = async () => {
    try {
      setDebugInfo((prev) => prev + '=== DIAGNOSTIC DE LA BASE DE DONNÉES ===\n');

      // Test 1: Vérifier la connexion (simple select)
      const { error: connectionError } = await supabase.from('players').select('id').limit(1);
      if (connectionError) {
        setDebugInfo((prev) => prev + `❌ Erreur de connexion: ${connectionError.message}\n`);
        return;
      }
      setDebugInfo((prev) => prev + '✅ Connexion à Supabase OK\n');

      // Test 2: Compter les personnages existants de l’utilisateur
      const { data: existingPlayers, error: countError } = await supabase
        .from('players')
        .select('id, user_id, name')
        .eq('user_id', session.user.id);

      if (countError) {
        setDebugInfo((prev) => prev + `❌ Erreur lors du comptage: ${countError.message}\n`);
      } else {
        setDebugInfo(
          (prev) =>
            prev +
            `📊 Personnages existants: ${existingPlayers?.length || 0}\n` +
            (existingPlayers && existingPlayers.length > 0
              ? `📝 Noms: ${existingPlayers.map((p) => p.name).join(', ')}\n`
              : '')
        );
      }
    } catch (error: any) {
      setDebugInfo((prev) => prev + `💥 Erreur de diagnostic: ${error.message}\n`);
    }
  };

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
      setDebugInfo((prev) => prev + `✅ Récupération réussie: ${data?.length || 0} personnages\n`);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des personnages:', error);
      setDebugInfo((prev) => prev + `❌ Erreur de récupération: ${error.message}\n`);
      toast.error('Erreur lors de la récupération des personnages');
    } finally {
      setLoading(false);
    }
  };

  const createNewCharacter = async () => {
    if (!newCharacterName.trim()) {
      toast.error('Veuillez entrer un nom pour votre personnage');
      return;
    }
    if (creating) return;

    setCreating(true);
    setDebugInfo((prev) => prev + `\n🚀 TENTATIVE DE CRÉATION: "${newCharacterName}"\n`);

    try {
      // Vérifier la session
      if (!session || !session.user?.id) {
        throw new Error('Session invalide - veuillez vous reconnecter');
      }

      // Vérifier l’auth utilisateur
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData?.user) {
        throw new Error('Utilisateur non authentifié - veuillez vous reconnecter');
      }

      // 1) Tentative via RPC standard
      try {
        const { data: playerId, error: rpcError } = await supabase.rpc('create_player_with_defaults', {
          p_user_id: authData.user.id,
          p_name: newCharacterName.trim(),
          p_adventurer_name: newCharacterName.trim(),
        });
        if (rpcError) {
          setDebugInfo((prev) => prev + `❌ Erreur RPC: ${rpcError.message}\n`);
          throw rpcError;
        }

        // Récupérer le personnage créé
        const { data: newPlayer, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .single();
        if (fetchError) {
          setDebugInfo((prev) => prev + `❌ Erreur récupération: ${fetchError.message}\n`);
          throw fetchError;
        }

        setPlayers((prev) => [...prev, newPlayer]);
        setNewCharacterName('');
        setShowCreateForm(false);
        setDebugInfo((prev) => prev + `🎉 SUCCÈS: Personnage créé avec RPC!\n`);
        toast.success('Nouveau personnage créé !');
        return;
      } catch (rpcError: any) {
        // 2) Fallback: retenter la même RPC (ex: latence d’activation) avant abandon
        setDebugInfo((prev) => prev + `🔄 Tentative alternative RPC...\n`);
        const { data: playerId2, error: rpcError2 } = await supabase.rpc('create_player_with_defaults', {
          p_user_id: authData.user.id,
          p_name: newCharacterName.trim(),
          p_adventurer_name: newCharacterName.trim(),
        });
        if (rpcError2) {
          setDebugInfo(
            (prev) =>
              prev +
              `❌ Erreur alternative RPC: ${rpcError2.message} (Code: ${rpcError2.code || 'NA'})\n`
          );
          throw rpcError2;
        }
        const { data: newPlayer2, error: fetchError2 } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId2)
          .single();
        if (fetchError2) {
          setDebugInfo((prev) => prev + `❌ Erreur récupération: ${fetchError2.message}\n`);
          throw fetchError2;
        }
        setPlayers((prev) => [...prev, newPlayer2]);
        setNewCharacterName('');
        setShowCreateForm(false);
        setDebugInfo((prev) => prev + `🎉 SUCCÈS: Personnage créé (RPC alt)!\n`);
        toast.success('Nouveau personnage créé !');
      }
    } catch (error: any) {
      setDebugInfo((prev) => prev + `💥 ÉCHEC TOTAL: ${error.message}\n`);
      console.error('Erreur lors de la création du personnage:', error);

      // Messages d'erreur détaillés
      if (error.message?.includes('Session invalide') || error.message?.includes('non authentifié')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        await supabase.auth.signOut();
      } else if (error.code === 'PGRST202') {
        toast.error('Fonction de création non disponible. Réessayez plus tard.');
      } else if (error.code === '23505' || error.message?.includes('duplicate key')) {
        toast.error('Un personnage existe déjà avec ces paramètres.');
      } else if (error.code === '42501' || error.message?.includes('policy')) {
        toast.error('Problème de permissions. Reconnectez-vous et réessayez.');
      } else {
        toast.error('Impossible de créer le personnage. Veuillez contacter le support.');
      }

      setShowDebug(true);
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Utiliser le service d'authentification
      const { error } = await authService.signOut();
      if (error) throw error;

      toast.success('Déconnexion réussie');

      // Forcer le rechargement sur Chrome mobile
      if (
        navigator.userAgent.includes('Chrome') &&
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ) {
        // Nettoyer tout le stockage local
        localStorage.clear();
        sessionStorage.clear();

        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } catch (error: any) {
      console.error('Erreur de déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleDeleteCharacter = async (character: Player) => {
    if (deleteConfirmation !== 'Supprime') {
      toast.error('Veuillez taper exactement "Supprime" pour confirmer');
      return;
    }

    try {
      // Utiliser la fonction de suppression sécurisée si elle existe (essai/erreur)
      let deleted = false;
      try {
        await supabase.rpc('delete_character_safely', { character_id: character.id });
        deleted = true;
      } catch {
        deleted = false;
      }

      if (!deleted) {
        // Suppression directe si la fonction n'existe pas
        const { error } = await supabase.from('players').delete().eq('id', character.id);
        if (error) throw error;
      }

      // Mettre à jour la liste des personnages
      setPlayers((prev) => prev.filter((p) => p.id !== character.id));
      setDeletingCharacter(null);
      setDeleteConfirmation('');

      toast.success(`Personnage "${character.adventurer_name || character.name}" supprimé`);
    } catch (error: any) {
      console.error('Erreur lors de la suppression du personnage:', error);
      toast.error('Erreur lors de la suppression du personnage');
    }
  };

  const getClassIcon = (playerClass: string | null | undefined) => {
    switch (playerClass) {
      case 'Guerrier':
      case 'Paladin':
        return <Sword className="w-5 h-5 text-red-500" />;
      case 'Magicien':
      case 'Ensorceleur':
      case 'Occultiste': // nouveau 2024
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'Clerc':
      case 'Druide':
        return <Shield className="w-5 h-5 text-yellow-500" />;
      default:
        return <User className="w-5 h-5 text-gray-500" />;
    }
  };

  // Affichage: remplacer "Sorcier" par "Occultiste" pour les anciens persos
  const displayClassName = (cls?: string | null) => (cls === 'Sorcier' ? 'Occultiste' : cls || '');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
          <p className="text-gray-400">Chargement des personnages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="character-selection-page min-h-screen" style={{ background: 'transparent' }}>
      <div className="min-h-screen py-8">
        {/* Container centré avec une largeur maximale */}
        <div className="w-full max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 pt-8">
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{
                textShadow: `
                  0 0 15px rgba(255, 255, 255, 0.9),
                  0 0 20px rgba(255, 255, 255, 0.6),
                  0 0 30px rgba(255, 255, 255, 0.4),
                  0 0 40px rgba(255, 255, 255, 0.2)
                `,
              }}
            >
              Mes Personnages
            </h1>
            <div className="flex items-center justify-center gap-4">
              <p
                className="text-gray-300"
                style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}
              >
                {players.length > 0
                  ? `${players.length} personnage${players.length > 1 ? 's' : ''} créé${
                      players.length > 1 ? 's' : ''
                    }`
                  : 'Aucun personnage créé'}
              </p>
              {debugInfo && (
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <AlertCircle size={16} />
                  Debug
                </button>
              )}
            </div>
          </div>

          {/* Debug Panel */}
          {showDebug && debugInfo && (
            <div className="mb-8">
              <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-yellow-400">
                    Informations de débogage
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={runDiagnostic}
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      <RefreshCw size={14} />
                      Actualiser
                    </button>
                    <button
                      onClick={() => setShowDebug(false)}
                      className="text-gray-400 hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-gray-300 bg-black/50 p-3 rounded overflow-x-auto whitespace-pre-wrap">
                  {debugInfo}
                </pre>
              </div>
            </div>
          )}

          {/* Modal de suppression */}
          {deletingCharacter && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">Supprimer le personnage</h3>
                    <p className="text-sm text-gray-400">
                      {deletingCharacter.adventurer_name || deletingCharacter.name}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-300 text-sm font-medium mb-2">
                      ⚠️ Attention : Cette action est irréversible !
                    </p>
                    <p className="text-gray-300 text-sm">
                      Toutes les données du personnage (inventaire, attaques, statistiques) seront
                      définitivement supprimées.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Pour confirmer, tapez exactement :{' '}
                      <span className="text-red-400 font-bold">Supprime</span>
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      className="input-dark w-full px-3 py-2 rounded-md"
                      placeholder="Tapez 'Supprime' pour confirmer"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => handleDeleteCharacter(deletingCharacter)}
                      disabled={deleteConfirmation !== 'Supprime'}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex-1 transition-colors"
                    >
                      Supprimer définitivement
                    </button>
                    <button
                      onClick={() => {
                        setDeletingCharacter(null);
                        setDeleteConfirmation('');
                      }}
                      className="btn-secondary px-4 py-2 rounded-lg"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Characters Grid */}
          <div className="flex justify-center mb-8 sm:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
              {players.map((player) => {
                const maxHp = Math.max(0, Number(player.max_hp || 0));
                const currHp = Math.max(0, Number(player.current_hp || 0));
                const tempHp = Math.max(0, Number(player.temporary_hp || 0));
                const ratio = maxHp > 0 ? Math.min(100, Math.max(0, ((currHp + tempHp) / maxHp) * 100)) : 0;

                return (
                  <div
                    key={player.id}
                    className="w-full max-w-sm relative group bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl shadow-lg overflow-hidden hover:bg-slate-700/70 transition-all duration-200"
                  >
                    {/* Bouton de suppression (z-index + blocage de la propagation) */}
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeletingCharacter(player);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-20 pointer-events-auto"
                      title="Supprimer le personnage"
                      aria-label="Supprimer le personnage"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* Zone cliquable pour ouvrir le personnage */}
                    <div
                      className="p-6 cursor-pointer hover:scale-[1.02] transition-all duration-200 relative z-10"
                      onClick={() => onCharacterSelect(player)}
                    >
                      {/* Avatar et informations */}
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-white/10">
                          <Avatar
                            url={player.avatar_url}
                            playerId={player.id}
                            size="md"
                            editable={false}
                            onAvatarUpdate={() => {}}
                          />
                        </div>

                        {/* Character Info */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="text-lg font-bold text-gray-100 mb-1 truncate">
                              {player.adventurer_name || player.name}
                            </h3>

                            {player.class ? (
                              <div className="flex items-center gap-2 mb-2">
                                {getClassIcon(player.class)}
                                <span className="text-sm text-slate-200">
                                  {displayClassName(player.class)} niveau {player.level}
                                </span>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 mb-2">Personnage non configuré</p>
                            )}
                          </div>

                          {/* Health Bar */}
                          <div className="space-y-2">
                            <div className="w-full bg-slate-700/50 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-300">
                              {currHp} / {maxHp} PV
                              {tempHp > 0 && <span className="text-blue-300 ml-1">(+{tempHp})</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Create New Character Card */}
              <div
                onClick={() => setShowCreateForm(true)}
                className="w-full max-w-sm cursor-pointer hover:scale-[1.02] transition-all duration-200 bg-slate-800/40 backdrop-blur-sm border-dashed border-2 border-slate-600/50 hover:border-green-500/60 rounded-xl"
              >
                <div className="p-6 flex items-center justify-center gap-6 min-h-[140px]">
                  <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-100 mb-2">Nouveau Personnage</h3>
                    <p className="text-sm text-slate-300">
                      Créez un nouveau personnage pour vos aventures
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Character Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-100">Créer un nouveau personnage</h3>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCharacterName('');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition"
                    aria-label="Fermer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nom du personnage
                    </label>
                    <input
                      type="text"
                      value={newCharacterName}
                      onChange={(e) => setNewCharacterName(e.target.value)}
                      className="input-dark w-full px-3 py-2 rounded-md"
                      placeholder="Entrez le nom de votre personnage"
                      autoFocus
                      disabled={creating}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={createNewCharacter}
                      disabled={creating || !newCharacterName.trim()}
                      className="btn-primary flex-1 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Création...
                        </>
                      ) : (
                        'Créer'
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewCharacterName('');
                      }}
                      disabled={creating}
                      className="btn-secondary px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="w-full max-w-md mx-auto px-4">
          <button
            onClick={handleSignOut}
            className="w-full btn-secondary px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

export default CharacterSelectionPage;