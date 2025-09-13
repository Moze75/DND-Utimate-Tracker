import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Database, Wifi, RefreshCw } from 'lucide-react';
import { Player } from '../types/dnd';
import { HPDiagnostic, HPDiagnosticResult } from '../utils/hpDiagnostic';

interface HPDiagnosticPanelProps {
  player: Player;
  onClose: () => void;
}

export function HPDiagnosticPanel({ player, onClose }: HPDiagnosticPanelProps) {
  const [diagnostic, setDiagnostic] = useState<HPDiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const result = await HPDiagnostic.diagnosePlayer(player);
      setDiagnostic(result);
    } catch (error) {
      console.error('Erreur lors du diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, [player.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-100">
              Diagnostic PV - {player.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-300 rounded-lg hover:bg-gray-700/50"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              <span className="ml-3 text-gray-400">Diagnostic en cours...</span>
            </div>
          ) : diagnostic ? (
            <>
              {/* État actuel */}
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-100 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  État actuel
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">PV actuels:</span>
                    <span className="ml-2 text-gray-100 font-medium">{diagnostic.currentHp}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">PV max:</span>
                    <span className="ml-2 text-gray-100 font-medium">{diagnostic.maxHp}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">PV temporaires:</span>
                    <span className="ml-2 text-gray-100 font-medium">{diagnostic.temporaryHp}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tentatives de sauvegarde:</span>
                    <span className="ml-2 text-gray-100 font-medium">{diagnostic.saveAttempts}</span>
                  </div>
                </div>
              </div>

              {/* Erreurs détectées */}
              {diagnostic.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-red-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Problèmes détectés
                  </h3>
                  <ul className="space-y-2">
                    {diagnostic.errors.map((error, index) => (
                      <li key={index} className="text-sm text-red-200 flex items-start gap-2">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommandations */}
              {diagnostic.recommendations.length > 0 && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-300 mb-3 flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Recommandations
                  </h3>
                  <ul className="space-y-2">
                    {diagnostic.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-blue-200 flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={runDiagnostic}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Relancer le diagnostic
                </button>
                <button
                  onClick={() => {
                    console.log('=== DIAGNOSTIC COMPLET ===');
                    console.log(JSON.stringify(diagnostic, null, 2));
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg transition-colors"
                >
                  Exporter vers console
                </button>
              </div>

              {/* Instructions pour l'utilisateur */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-600/30">
                <h4 className="text-sm font-medium text-gray-200 mb-2">
                  Instructions pour reproduire le problème :
                </h4>
                <ol className="text-xs text-gray-400 space-y-1">
                  <li>1. Modifiez les PV du personnage</li>
                  <li>2. Attendez quelques secondes</li>
                  <li>3. Quittez l'interface (fermer l'onglet ou naviguer ailleurs)</li>
                  <li>4. Revenez sur l'interface</li>
                  <li>5. Vérifiez si les PV sont revenus à 100%</li>
                  <li>6. Si oui, relancez ce diagnostic pour identifier la cause</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Aucun diagnostic disponible</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}