import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload } from '../types/characterCreator';

// Version "safe" sans colonnes additionnelles, sans RPC one-shot.
// On utilise uniquement la RPC existante create_player_with_defaults puis un update minimal.
export async function createCharacterFromCreatorPayload(
  session: any,
  payload: CharacterExportPayload
): Promise<Player> {
  if (!session?.user?.id) throw new Error('Session invalide');

  // 1) Créer un player "vide" avec defaults (retourne l'id)
  const { data: playerId, error: rpcError } = await supabase.rpc('create_player_with_defaults', {
    p_user_id: session.user.id,
    p_name: payload.characterName,
    p_adventurer_name: payload.characterName,
  });
  if (rpcError) throw rpcError;

  // 2) Mettre à jour uniquement les colonnes qui existent dans players
  const { error: updError } = await supabase
    .from('players')
    .update({
      class: payload.selectedClass,
      level: payload.level ?? 1,
      max_hp: payload.hitPoints,
      current_hp: payload.hitPoints,
      // Pas d'armor_class, initiative, speed, race, background ici
      // Pas de JSON (abilities_json, skills_json, equipment_json) si les colonnes n'existent pas
    })
    .eq('id', playerId);
  if (updError) throw updError;

  // 3) Récupérer et retourner le player créé
  const { data: newPlayer, error: fetchError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (fetchError) throw fetchError;

  return newPlayer as Player;
}