/* Persistance des cases cochées des aptitudes
   - Utilise Supabase RPC si window.supabase est dispo (fonctions: list_character_feature_checks / upsert_character_feature_check)
   - Fallback sur localStorage sinon (clé: ut:feature-checks:<characterId|anon>)
*/

declare global {
  interface Window {
    supabase?: {
      rpc: (fn: string, args?: Record<string, any>) => Promise<{ data: any; error: any }>;
    };
  }
}

type LoadMap = Map<string, boolean>;

const LS_PREFIX = 'ut:feature-checks:';
const ANON_ID = 'anon';

function lsKey(characterId?: string | null) {
  return `${LS_PREFIX}${characterId ?? ANON_ID}`;
}

function readLocal(characterId?: string | null): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(lsKey(characterId));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeLocal(characterId: string | null | undefined, rec: Record<string, boolean>) {
  try {
    localStorage.setItem(lsKey(characterId), JSON.stringify(rec));
  } catch {
    // ignore
  }
}

function hasSupabase(): boolean {
  return typeof window !== 'undefined' && !!window.supabase?.rpc;
}

/* Charge l’état des cases pour un personnage (Map<feature_key, checked>) */
export async function loadFeatureChecks(characterId?: string | null): Promise<LoadMap> {
  if (hasSupabase()) {
    const { data, error } = await window.supabase!.rpc('list_character_feature_checks', {
      p_character_id: characterId ?? null,
    });
    if (error) throw error;
    const map = new Map<string, boolean>();
    for (const row of (data ?? []) as Array<{ feature_key: string; checked: boolean }>) {
      map.set(row.feature_key, !!row.checked);
    }
    return map;
  }

  // Fallback local
  const rec = readLocal(characterId);
  return new Map<string, boolean>(Object.entries(rec));
}

/* Sauvegarde/Met à jour l’état d’une case (upsert) */
export async function upsertFeatureCheck(params: {
  characterId?: string | null;
  className: string;
  subclassName?: string | null;
  featureKey: string;
  checked: boolean;
}): Promise<void> {
  const { characterId, className, subclassName, featureKey, checked } = params;

  if (hasSupabase()) {
    const { error } = await window.supabase!.rpc('upsert_character_feature_check', {
      p_character_id: characterId ?? null,
      p_class_name: className,
      p_subclass_name: subclassName ?? null,
      p_feature_key: featureKey,
      p_checked: checked,
    });
    if (error) throw error;
    return;
  }

  // Fallback local
  const rec = readLocal(characterId);
  rec[featureKey] = !!checked;
  writeLocal(characterId, rec);
}

/* Astuce: si tu as un client Supabase dans ton projet, tu peux remplacer les appels window.supabase par ton import:
   import { supabase } from '@/lib/supabaseClient';
   puis:
   supabase.rpc('list_character_feature_checks', {...})
   supabase.rpc('upsert_character_feature_check', {...})
*/