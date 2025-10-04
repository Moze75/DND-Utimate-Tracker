import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handlePWAUpdate = (event: Event) => {
      console.log('[PWA] Nouvelle version disponible');
      setNeedRefresh(true);
      setShowPrompt(true);
    };

    const handlePWAOffline = (event: Event) => {
      console.log('[PWA] Application prête hors-ligne');
    };

    window.addEventListener('pwa:need-refresh', handlePWAUpdate);
    window.addEventListener('pwa:offline-ready', handlePWAOffline);

    return () => {
      window.removeEventListener('pwa:need-refresh', handlePWAUpdate);
      window.removeEventListener('pwa:offline-ready', handlePWAOffline);
    };
  }, []);

  const close = () => {
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50">
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
