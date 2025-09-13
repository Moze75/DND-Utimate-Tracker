import { supabase } from '../lib/supabase';
import { Player, InventoryItem, Attack } from '../types/dnd';

// Service pour gérer les requêtes liées aux joueurs
export const playerService = {
  // Récupérer un joueur avec ses données associées
  async getPlayerWithRelatedData(playerId: string): Promise<{
    player: Player | null;
    inventory: InventoryItem[];
    attacks: Attack[];
  }> {
    try {
      // Récupérer le joueur
      const { data: player, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;

      // Récupérer l'inventaire
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', playerId);

      if (inventoryError) throw inventoryError;

      // Récupérer les attaques
      const { data: attacks, error: attacksError } = await supabase
        .from('attacks')
        .select('*')
        .eq('player_id', playerId);

      if (attacksError) throw attacksError;

      return {
        player,
        inventory: inventory || [],
        attacks: attacks || []
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des données du joueur:', error);
      return {
        player: null,
        inventory: [],
        attacks: []
      };
    }
  },

  // Mettre à jour un joueur
  async updatePlayer(player: Player): Promise<Player | null> {
    try {
      const { data, error } = await supabase
        .from('players')
        .update(player)
        .eq('id', player.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du joueur:', error);
      return null;
    }
  },

  // Effectuer un repos court
  async performShortRest(playerId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('perform_short_rest', { p_id: playerId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors du repos court:', error);
      return null;
    }
  },

  // Effectuer un repos long
  async performLongRest(playerId: string): Promise<Player | null> {
    try {
      const { data, error } = await supabase
        .rpc('perform_long_rest', { p_id: playerId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors du repos long:', error);
      return null;
    }
  }
};