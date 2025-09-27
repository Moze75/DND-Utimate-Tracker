import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';
import { CharacterExportPayload } from '../types/characterCreator';

export async function createCharacterFromCreatorPayload(
  session: any,
  payload: CharacterExportPayload
): Promise<Player> {
  if (!session?.user?.id) throw new Error('Session invalide');

  try {
    const { data: newId, error: rpcError } = await supabase.rpc('create_player_from_creator', {
      p_user_id: session.user.id,
      p_payload: payload as any,
    });
    if (rpcError) throw rpcError;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', newId)
      .single();
    if (error) throw error;
    return data as Player;
  } catch (e) {
    const { data: playerId, error: rpc2 } = await supabase.rpc('create_player_with_defaults', {
      p_user_id: session.user.id,
      p_name: payload.characterName,
      p_adventurer_name: payload.characterName,
    });
    if (rpc2) throw rpc2;

    const { error: updError } = await supabase
      .from('players')
      .update({
        class: payload.selectedClass,
        level: payload.level ?? 1,
        race: payload.selectedRace,
        background: payload.selectedBackground,
        max_hp: payload.hitPoints,
        current_hp: payload.hitPoints,
        armor_class: payload.armorClass,
        initiative: payload.initiative,
        speed: payload.speed,
        // Si vous avez des colonnes JSON, décommentez:
        // abilities_json: payload.finalAbilities,
        // skills_json: payload.proficientSkills,
        // equipment_json: payload.equipment,
      })
      .eq('id', playerId);
    if (updError) throw updError;

    const { data: newPlayer, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    if (fetchError) throw fetchError;

    return newPlayer as Player;
  }
}