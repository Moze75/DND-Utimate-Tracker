import { supabase } from '../lib/supabase';
import { Player } from '../types/dnd';

export interface HPDiagnosticResult {
  timestamp: string;
  playerId: string;
  playerName: string;
  currentHp: number;
  maxHp: number;
  temporaryHp: number;
  lastUpdate: string;
  saveAttempts: number;
  errors: string[];
  recommendations: string[];
}

export class HPDiagnostic {
  private static saveAttempts = new Map<string, number>();
  private static lastSaveTime = new Map<string, number>();
  private static errors = new Map<string, string[]>();

  static async diagnosePlayer(player: Player): Promise<HPDiagnosticResult> {
    const playerId = player.id;
    const now = new Date().toISOString();
    
    console.log('=== DIAGNOSTIC PV POUR LE JOUEUR ===');
    console.log('ID:', playerId);
    console.log('Nom:', player.name);
    console.log('PV actuels (frontend):', player.current_hp);
    console.log('PV max:', player.max_hp);
    console.log('PV temporaires:', player.temporary_hp);

    // Vérifier les données en base
    const { data: dbPlayer, error: fetchError } = await supabase
      .from('players')
      .select('current_hp, max_hp, temporary_hp, updated_at')
      .eq('id', playerId)
      .single();

    if (fetchError) {
      console.error('❌ Erreur lors de la récupération des données:', fetchError);
      this.addError(playerId, `Fetch error: ${fetchError.message}`);
    } else {
      console.log('=== DONNÉES EN BASE ===');
      console.log('PV actuels (DB):', dbPlayer.current_hp);
      console.log('PV max (DB):', dbPlayer.max_hp);
      console.log('PV temporaires (DB):', dbPlayer.temporary_hp);
      console.log('Dernière mise à jour (DB):', dbPlayer.updated_at);
      
      // Vérifier la cohérence
      if (player.current_hp !== dbPlayer.current_hp) {
        console.warn('⚠️ INCOHÉRENCE DÉTECTÉE:');
        console.warn(`Frontend: ${player.current_hp} PV`);
        console.warn(`Base de données: ${dbPlayer.current_hp} PV`);
        this.addError(playerId, `HP mismatch: Frontend=${player.current_hp}, DB=${dbPlayer.current_hp}`);
      }
    }

    // Test de sauvegarde
    console.log('=== TEST DE SAUVEGARDE ===');
    const testSaveResult = await this.testSave(playerId, player.current_hp);
    
    // Vérifier la session
    const { data: session } = await supabase.auth.getSession();
    console.log('=== SESSION ===');
    console.log('Utilisateur connecté:', !!session?.session?.user);
    console.log('User ID:', session?.session?.user?.id);
    console.log('Email:', session?.session?.user?.email);

    // Vérifier les politiques RLS
    const rlsTest = await this.testRLS(playerId);

    return {
      timestamp: now,
      playerId,
      playerName: player.name,
      currentHp: player.current_hp,
      maxHp: player.max_hp,
      temporaryHp: player.temporary_hp,
      lastUpdate: dbPlayer?.updated_at || 'Unknown',
      saveAttempts: this.saveAttempts.get(playerId) || 0,
      errors: this.errors.get(playerId) || [],
      recommendations: this.generateRecommendations(playerId, player, dbPlayer)
    };
  }

  private static async testSave(playerId: string, currentHp: number): Promise<boolean> {
    try {
      console.log('🧪 Test de sauvegarde...');
      
      const { error } = await supabase
        .from('players')
        .update({ current_hp: currentHp })
        .eq('id', playerId);

      if (error) {
        console.error('❌ Échec du test de sauvegarde:', error);
        this.addError(playerId, `Save test failed: ${error.message}`);
        return false;
      } else {
        console.log('✅ Test de sauvegarde réussi');
        return true;
      }
    } catch (error: any) {
      console.error('💥 Erreur lors du test de sauvegarde:', error);
      this.addError(playerId, `Save test exception: ${error.message}`);
      return false;
    }
  }

  private static async testRLS(playerId: string): Promise<boolean> {
    try {
      console.log('🔒 Test des politiques RLS...');
      
      const { data, error } = await supabase
        .from('players')
        .select('id, user_id')
        .eq('id', playerId)
        .single();

      if (error) {
        console.error('❌ Échec du test RLS:', error);
        this.addError(playerId, `RLS test failed: ${error.message}`);
        return false;
      } else {
        console.log('✅ Test RLS réussi');
        console.log('Player user_id:', data.user_id);
        return true;
      }
    } catch (error: any) {
      console.error('💥 Erreur lors du test RLS:', error);
      this.addError(playerId, `RLS test exception: ${error.message}`);
      return false;
    }
  }

  private static addError(playerId: string, error: string) {
    if (!this.errors.has(playerId)) {
      this.errors.set(playerId, []);
    }
    this.errors.get(playerId)!.push(error);
  }

  private static generateRecommendations(playerId: string, frontendPlayer: Player, dbPlayer: any): string[] {
    const recommendations: string[] = [];

    // Vérifier l'incohérence des données
    if (dbPlayer && frontendPlayer.current_hp !== dbPlayer.current_hp) {
      recommendations.push('🔄 Rechargez la page pour synchroniser les données');
      recommendations.push('📊 Vérifiez si d\'autres utilisateurs modifient le même personnage');
    }

    // Vérifier les erreurs de sauvegarde
    const playerErrors = this.errors.get(playerId) || [];
    if (playerErrors.length > 0) {
      recommendations.push('🔐 Vérifiez que vous êtes bien connecté');
      recommendations.push('🔒 Vérifiez les permissions sur ce personnage');
    }

    // Vérifier la fréquence de sauvegarde
    const saveCount = this.saveAttempts.get(playerId) || 0;
    if (saveCount > 10) {
      recommendations.push('⚠️ Trop de tentatives de sauvegarde - possible problème de réseau');
      recommendations.push('🌐 Vérifiez votre connexion Internet');
    }

    // Recommandations générales
    if (recommendations.length === 0) {
      recommendations.push('✅ Aucun problème détecté - surveillance continue recommandée');
    }

    return recommendations;
  }

  static trackSaveAttempt(playerId: string) {
    const current = this.saveAttempts.get(playerId) || 0;
    this.saveAttempts.set(playerId, current + 1);
    this.lastSaveTime.set(playerId, Date.now());
  }

  static async runFullDiagnostic(player: Player): Promise<void> {
    console.log('🔍 LANCEMENT DU DIAGNOSTIC COMPLET DES PV');
    
    const result = await this.diagnosePlayer(player);
    
    console.log('=== RAPPORT DE DIAGNOSTIC ===');
    console.log('Timestamp:', result.timestamp);
    console.log('Joueur:', result.playerName);
    console.log('PV actuels:', result.currentHp);
    console.log('Tentatives de sauvegarde:', result.saveAttempts);
    console.log('Erreurs:', result.errors);
    console.log('Recommandations:', result.recommendations);

    // Afficher un résumé dans la console
    if (result.errors.length > 0) {
      console.error('🚨 PROBLÈMES DÉTECTÉS:');
      result.errors.forEach(error => console.error('  -', error));
    }

    if (result.recommendations.length > 0) {
      console.info('💡 RECOMMANDATIONS:');
      result.recommendations.forEach(rec => console.info('  -', rec));
    }

    // Test de connectivité Supabase
    await this.testSupabaseConnectivity();
  }

  private static async testSupabaseConnectivity(): Promise<void> {
    console.log('=== TEST DE CONNECTIVITÉ SUPABASE ===');
    
    try {
      // Test 1: Ping simple
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('players')
        .select('count')
        .limit(1);
      const endTime = Date.now();
      
      if (error) {
        console.error('❌ Test de connectivité échoué:', error);
      } else {
        console.log(`✅ Connectivité OK (${endTime - startTime}ms)`);
      }

      // Test 2: Vérifier les permissions
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        console.log('✅ Session active');
        console.log('Token expires at:', new Date(session.session.expires_at! * 1000));
      } else {
        console.warn('⚠️ Aucune session active');
      }

    } catch (error: any) {
      console.error('💥 Erreur de connectivité:', error);
    }
  }

  // Fonction pour surveiller les sauvegardes en temps réel
  static monitorSaves(player: Player, onUpdate: (player: Player) => void) {
    const originalOnUpdate = onUpdate;
    
    return (updatedPlayer: Player) => {
      console.log('🔄 SAUVEGARDE DÉTECTÉE');
      console.log('Ancien PV:', player.current_hp);
      console.log('Nouveau PV:', updatedPlayer.current_hp);
      
      this.trackSaveAttempt(player.id);
      
      // Vérifier si les PV ont changé de manière inattendue
      if (updatedPlayer.current_hp === updatedPlayer.max_hp && player.current_hp !== updatedPlayer.max_hp) {
        console.warn('⚠️ PV REMIS AU MAXIMUM DÉTECTÉ!');
        console.warn('Cela pourrait indiquer un problème de sauvegarde ou de synchronisation');
      }
      
      originalOnUpdate(updatedPlayer);
    };
  }
}

// Fonction utilitaire pour lancer le diagnostic depuis la console
(window as any).diagnosePV = (player: Player) => {
  HPDiagnostic.runFullDiagnostic(player);
};

// Fonction pour surveiller un joueur spécifique
(window as any).surveillerPV = (player: Player, onUpdate: (player: Player) => void) => {
  return HPDiagnostic.monitorSaves(player, onUpdate);
};