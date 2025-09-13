import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types/dnd';

// Service pour gérer les requêtes liées à l'inventaire
export const inventoryService = {
  // Récupérer l'inventaire d'un joueur
  async getPlayerInventory(playerId: string): Promise<InventoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('player_id', playerId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'inventaire:', error);
      return [];
    }
  },

  // Ajouter un objet à l'inventaire
  async addItem(item: Partial<InventoryItem>): Promise<InventoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'objet:', error);
      return null;
    }
  },

  // Supprimer un objet de l'inventaire
  async removeItem(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'objet:', error);
      return false;
    }
  }
};