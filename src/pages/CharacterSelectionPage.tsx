import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload } from '../types/CharacterExport';
import CharacterCreatorModal from '../components/CharacterCreatorModal';
import { createCharacterFromCreatorPayload } from '../services/characterCreationIntegration';

export default function CharacterSelectionPage() {
  const [session, setSession] = useState<any>(null);

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  const [debugInfo, setDebugInfo] = useState<string>('');

  // Init session + fetch players
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await fetchPlayers(data.session);
      }
    };

    load();

    // Keep session up-to-date
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
      if (sess?.user?.id) fetchPlayers(sess);
      else setPlayers([]);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchPlayers = async (activeSession = session) => {
    if (!activeSession?.user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', activeSession.user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
      setDebugInfo((prev) => prev + `✅ Récupération: ${data?.length || 0} personnages\n`);
    } catch (error: any) {
      console.error('Erreur de récupération:', error);
      setDebugInfo((prev) => prev + `❌ Erreur de récupération: ${error.message}\n`);
      toast.error('Erreur lors de la récupération des personnages');
    } finally {
      setLoading(false);
    }
  };

  // Sélection d’un personnage (navigation/app logic à adapter si besoin)
  const onCharacterSelect = (player: Player) => {
    setDebugInfo((prev) => prev + `➡️ Sélection: ${player.name}\n`);
    toast.success(`Personnage sélectionné: ${player.name}`);
    // Si vous avez un routeur, naviguez ici.
  };

  // Création à partir du payload renvoyé par le wizard
  const handleCreatorComplete = async (payload: CharacterExportPayload) => {
    if (creating) return;
    if (!session?.user?.id) {
      toast.error('Session introuvable. Veuillez vous reconnecter.');
      return;
    }
    try {
      setCreating(true);
      setDebugInfo((prev) => prev + `\n🚀 Création via assistant: "${payload.characterName}"\n`);

      const newPlayer = await createCharacterFromCreatorPayload(session, payload);

      setPlayers((prev) => [...prev, newPlayer]);
      toast.success('Nouveau personnage créé !');

      // Ouvre la modale de bienvenue centrée
      setShowWelcome(true);

      setShowCreator(false);
      onCharacterSelect(newPlayer);
    } catch (error: any) {
      console.error('Erreur création via assistant:', error);
      setDebugInfo((prev) => prev + `💥 ÉCHEC assistant: ${error.message}\n`);

      if (error?.message?.includes('Session invalide') || error?.message?.includes('non authentifié')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        await supabase.auth.signOut();
      } else {
        toast.error("Impossible de créer le personnage depuis l'assistant.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-gray-900 text-white border border-gray-700',
          duration: 4000,
        }}
      />

      <header className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mes personnages</h1>
        <button
          onClick={() => setShowCreator(true)}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors font-medium disabled:opacity-60"
          disabled={creating}
        >
          {creating ? 'Création...' : 'Créer un personnage'}
        </button>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="text-gray-400">Chargement des personnages...</div>
        ) : players.length === 0 ? (
          <div className="text-gray-400">
            Aucun personnage. Cliquez sur “Créer un personnage” pour commencer votre aventure.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {players.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-gray-800 bg-gray-900/40 hover:bg-gray-900/60 transition-colors p-4 cursor-pointer"
                onClick={() => onCharacterSelect(p)}
              >
                <div className="text-lg font-semibold">{p.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {p.class || '—'} • Niveau {p.level ?? 1}
                </div>
                <div className="text-xs text-gray-500 mt-2">Or: {p.gold ?? 0} • PV: {p.current_hp ?? p.max_hp ?? 0}</div>
              </li>
            ))}
          </ul>
        )}

        {debugInfo && (
          <pre className="mt-6 p-3 rounded-md bg-gray-900/50 border border-gray-800 text-xs whitespace-pre-wrap">
            {debugInfo}
          </pre>
        )}
      </main>

      {/* Modal de création */}
      <CharacterCreatorModal
        open={showCreator}
        onClose={() => setShowCreator(false)}
        onComplete={handleCreatorComplete}
        title="Assistant de création"
      />

      {/* Popup de bienvenue centré et accueillant */}
      {showWelcome && (
        <WelcomeOverlay
          onClose={() => setShowWelcome(false)}
          autoCloseAfterMs={4000}
        />
      )}
    </div>
  );
}

/* ===========================================================
   Composant de popup de bienvenue
   =========================================================== */
function WelcomeOverlay({
  onClose,
  autoCloseAfterMs = 0,
}: {
  onClose: () => void;
  autoCloseAfterMs?: number;
}) {
  useEffect(() => {
    if (!autoCloseAfterMs) return;
    const id = window.setTimeout(onClose, autoCloseAfterMs);
    return () => window.clearTimeout(id);
  }, [autoCloseAfterMs, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Carte centrée */}
      <div
        className="relative mx-4 w-full max-w-md rounded-2xl border border-red-500/30
                   bg-gradient-to-b from-gray-900 to-gray-800 p-6 text-center shadow-2xl
                   animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenue"
      >
        <div className="text-2xl font-bold text-white mb-2">
          Bienvenue, aventurier
        </div>
        <p className="text-gray-300 mb-6">
          L’histoire commence ici.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium shadow-md transition-colors"
        >
          Commencer
        </button>
      </div>

      {/* Animation d’apparition */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 180ms ease-out;
        }
      `}</style>
    </div>
  );
}