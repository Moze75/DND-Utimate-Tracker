import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Player } from '../types/dnd';
import { playerService } from '../services/playerService';

const LAST_SELECTED_CHARACTER_ID = 'ut:lastCharacterId';
const LAST_SELECTED_CHARACTER_SNAPSHOT = 'ut:lastCharacterSnapshot';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

interface CharacterSelectionPageProps {
  onSelect: (player: Player) => void;
}

export default function CharacterSelectionPage({ onSelect }: CharacterSelectionPageProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  const lastSelectedId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem(LAST_SELECTED_CHARACTER_ID) : null),
    []
  );

  // Helper robuste pour charger la liste des personnages de l'utilisateur
  const loadPlayers = async (): Promise<Player[]> => {
    const svc: any = playerService as any;
    try {
      if (svc?.getMyPlayers) return await svc.getMyPlayers();
      if (svc?.listMyPlayers) return await svc.listMyPlayers();
      if (svc?.listMine) return await svc.listMine();
      if (svc?.listByUser) return await svc.listByUser();
      if (svc?.getOwnedPlayers) return await svc.getOwnedPlayers();
      return [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await loadPlayers();
        if (!aborted) {
          setPlayers(Array.isArray(list) ? list : []);
        }
      } catch (e: any) {
        console.error('[CharacterSelection] load error:', e);
        if (!aborted) {
          setError(e?.message ?? 'Impossible de charger vos personnages.');
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  const handleSelect = (p: Player) => {
    try {
      localStorage.setItem(LAST_SELECTED_CHARACTER_ID, p.id);
      localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(p));
      // Si on venait d’utiliser “Retour aux personnages”, on réactive l’auto-resume pour les futurs démarrages
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
    } catch {
      // non critique
    }
    onSelect(p);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p: any) => {
      const name = p?.name ?? p?.nom ?? '';
      const klass = p?.class ?? p?.classe ?? p?.primaryClass ?? '';
      const level = p?.level ?? p?.niveau ?? '';
      return (
        String(name).toLowerCase().includes(q) ||
        String(klass).toLowerCase().includes(q) ||
        String(level).toLowerCase().includes(q)
      );
    });
  }, [players, query]);

  const retry = () => {
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const list = await loadPlayers();
        setPlayers(Array.isArray(list) ? list : []);
      } catch (e: any) {
        console.error('[CharacterSelection] retry error:', e);
        setError(e?.message ?? 'Impossible de charger vos personnages.');
        toast.error('Échec du rechargement');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-3xl mx-auto space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold">Sélection du personnage</h1>

        <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, classe, niveau…"
              className="w-full sm:w-72 px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              onClick={retry}
              className="btn-secondary px-3 py-2 rounded-lg whitespace-nowrap"
            >
              Recharger
            </button>
          </div>
        </header>

        {error && (
          <div className="stat-card p-4 border border-red-500/40">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={retry} className="btn-primary px-4 py-2 rounded-lg">
              Réessayer
            </button>
          </div>
        )}

        {loading ? (
          <div className="stat-card p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mx-auto mb-3" />
            <p className="text-gray-400">Chargement des personnages…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="stat-card p-6 text-center">
            <p className="text-gray-300 mb-2">Aucun personnage trouvé.</p>
            {query ? (
              <p className="text-gray-400 text-sm">Essayez d’effacer ou modifier votre recherche.</p>
            ) : (
              <p className="text-gray-400 text-sm">Créez un personnage pour commencer.</p>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((p: any) => {
              const name = p?.name ?? p?.nom ?? 'Sans nom';
              const klass = p?.class ?? p?.classe ?? p?.primaryClass ?? '';
              const level = p?.level ?? p?.niveau ?? '';
              const isLast = lastSelectedId && p.id === lastSelectedId;

              return (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelect(p)}
                    className={`w-full text-left stat-card p-4 rounded-lg border transition ${
                      isLast ? 'border-amber-400/60 ring-1 ring-amber-400/40' : 'border-transparent'
                    } hover:border-red-500/50 hover:shadow-md`}
                    title={isLast ? 'Dernier personnage utilisé' : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold">
                          {name}
                          {isLast && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 align-middle">
                              Dernier utilisé
                            </span>
                          )}
                        </h2>
                        <p className="text-gray-400">
                          {klass && <span className="mr-2">{String(klass)}</span>}
                          {level !== '' && <span>Niv. {String(level)}</span>}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}