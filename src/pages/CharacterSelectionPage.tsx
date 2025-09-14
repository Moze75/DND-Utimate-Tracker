import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { Player } from '../types/dnd';
import { supabase } from '../lib/supabase';
import { playerService } from '../services/playerService';

const LAST_SELECTED_CHARACTER_ID = 'ut:lastCharacterId';
const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter'; // aligne avec App.tsx
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

interface CharacterSelectionPageProps {
  session: any;
  onCharacterSelect: (player: Player) => void;
}

async function loadViaPlayerService(session: any): Promise<Player[]> {
  const svc: any = playerService as any;
  // Essaie en priorité des méthodes usuelles
  try {
    if (svc?.getMyPlayers) return await svc.getMyPlayers();
    if (svc?.listMyPlayers) return await svc.listMyPlayers();
    if (svc?.listMine) return await svc.listMine();
    if (svc?.getOwnedPlayers) return await svc.getOwnedPlayers();
    if (svc?.listByUser && session?.user?.id) return await svc.listByUser(session.user.id);
  } catch (e) {
    console.warn('[CharacterSelection] playerService error:', e);
  }
  return [];
}

async function loadViaSupabase(session: any): Promise<Player[]> {
  const uid = session?.user?.id;
  if (!uid) return [];

  // On essaye plusieurs colonnes possibles pour référencer le propriétaire
  const ownerColumns = ['user_id', 'owner_id', 'created_by', 'owner'];
  for (const col of ownerColumns) {
    const { data, error } = await supabase.from('players').select('*').eq(col, uid);
    if (error) {
      // 42P01 = table inconnue: on continue la boucle
      console.warn(`[CharacterSelection] Supabase query error on col "${col}":`, error);
      continue;
    }
    if (Array.isArray(data) && data.length > 0) {
      return data as Player[];
    }
  }

  // Dernier recours: on récupère tout (si les colonnes ne matchent pas), puis on filtre côté client si un champ userId-like existe
  const { data: all, error: allErr } = await supabase.from('players').select('*');
  if (allErr) {
    console.warn('[CharacterSelection] Supabase fallback all error:', allErr);
    return [];
  }
  const rows = Array.isArray(all) ? (all as any[]) : [];
  const filtered = rows.filter((p) => {
    const candidates = [p.user_id, p.owner_id, p.created_by, p.owner, p.userId, p.ownerId];
    return candidates.some((v) => v === uid);
  });
  return (filtered.length > 0 ? filtered : rows) as Player[];
}

export const CharacterSelectionPage: React.FC<CharacterSelectionPageProps> = ({
  session,
  onCharacterSelect,
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');

  const lastSelectedId = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem(LAST_SELECTED_CHARACTER_ID) : null),
    []
  );

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1) Essayer via playerService si dispo
      let list = await loadViaPlayerService(session);
      // 2) Sinon via Supabase
      if (!Array.isArray(list) || list.length === 0) {
        list = await loadViaSupabase(session);
      }
      setPlayers(Array.isArray(list) ? list : []);
    } catch (e: any) {
      console.error('[CharacterSelection] load error:', e);
      setError(e?.message ?? 'Impossible de charger vos personnages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // recharge sur changement d’utilisateur
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const handleSelect = (p: Player) => {
    try {
      localStorage.setItem(LAST_SELECTED_CHARACTER_ID, p.id);
      localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(p));
      // Si on venait d’utiliser “Retour aux personnages”, on réactive l’auto-resume pour les futurs démarrages
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
    } catch {
      // non critique
    }
    onCharacterSelect(p);
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
    loadPlayers().catch(() => {
      toast.error('Échec du rechargement');
    });
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
};

// Pour rester compatible avec un import par défaut éventuel
export default CharacterSelectionPage;