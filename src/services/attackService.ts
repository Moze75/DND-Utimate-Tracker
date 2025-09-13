import { supabase } from '../lib/supabase';
import { Attack } from '../types/dnd';

// Service pour gérer les requêtes liées aux attaques
export const attackService = {
  // Récupérer les attaques d'un joueur
  async getPlayerAttacks(playerId: string): Promise<Attack[]> {
    try {
      const { data, error } = await supabase
        .from('attacks')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des attaques:', error);
      return [];
    }
  },

  // Ajouter une attaque
  async addAttack(attack: Partial<Attack>): Promise<Attack | null> {
    try {
      const { data, error } = await supabase
        .from('attacks')
        .insert([attack])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'attaque:', error);
      return null;
    }
  },

  // Mettre à jour une attaque
  async updateAttack(attack: Partial<Attack>): Promise<Attack | null> {
    try {
      const { data, error } = await supabase
        .from('attacks')
        .update(attack)
        .eq('id', attack.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'attaque:', error);
      return null;
    }
  },

  // Supprimer une attaque
  async removeAttack(attackId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('attacks')
        .delete()
        .eq('id', attackId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'attaque:', error);
      return false;
    }
  }
};