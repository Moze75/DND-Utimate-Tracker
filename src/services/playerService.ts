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

  /**
   * Mettre à jour un joueur (PATCH partiel)
   * - Accepte un objet partiel + id obligatoire
   * - Normalise characterHistory -> character_history
   * - Ne push pas l'id dans les colonnes updatées
   */
  async updatePlayer(playerPatch: Partial<Player> & { id: string }): Promise<Player | null> {
    try {
      const { id, ...rest } = playerPatch;
      if (!id) throw new Error('updatePlayer: id manquant');

      // Copie "propre" des champs à mettre à jour
      const toUpdate: Record<string, any> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v !== 'undefined') toUpdate[k] = v;
      }

      // Normalisation: camelCase -> snake_case pour l'histoire
      if (typeof (toUpdate as any).characterHistory === 'string') {
        toUpdate.character_history = (toUpdate as any).characterHistory;
        delete (toUpdate as any).characterHistory;
      }

      // Sécurité: éviter d'envoyer par erreur des clés interdites
      // (si tu connais la liste exacte des colonnes, tu peux whitelister ici)
      // Exemple léger: ne jamais envoyer 'inventory' ni 'attacks' via players
      delete toUpdate.inventory;
      delete toUpdate.attacks;

      const { data, error } = await supabase
        .from('players')
        .update(toUpdate)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du joueur:', error);
      return null;
    }
  },

  /**
   * Mettre à jour uniquement l'histoire du personnage
   */
  async updateCharacterHistory(playerId: string, character_history: string): Promise<Player | null> {
    try {
      if (!playerId) throw new Error('updateCharacterHistory: playerId manquant');

      const { data, error } = await supabase
        .from('players')
        .update({ character_history })
        .eq('id', playerId)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de character_history:', error);
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