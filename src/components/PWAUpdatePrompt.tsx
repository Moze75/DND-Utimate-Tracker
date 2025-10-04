import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('[PWA] Service Worker enregistré', r);
    },
    onRegisterError(error) {
      console.error('[PWA] Erreur enregistrement SW:', error);
    },
  });

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (offlineReady) {
      console.log('[PWA] Application prête pour utilisation hors-ligne');
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 animate-slide-up">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <RefreshCw className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Mise à jour disponible</h3>
              <p className="text-sm text-gray-400 mt-1">
                Une nouvelle version de l'application est prête.
              </p>
            </div>
          </div>
          <button
            onClick={close}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Mettre à jour
          </button>
          <button
            onClick={close}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
