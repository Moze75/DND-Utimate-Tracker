import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecte iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Détecte si l'app est déjà installée
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Écoute l'événement beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Affiche le prompt après un délai
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Pour iOS, affiche le prompt après un délai si pas encore installé
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Cache le prompt pour cette session
    sessionStorage.setItem('installPromptDismissed', 'true');
  };

  // Ne pas afficher si déjà installé ou si déjà refusé cette session
  if (isStandalone || sessionStorage.getItem('installPromptDismissed') || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 rounded-xl shadow-2xl z-50 border border-red-500/20">
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Smartphone className="w-6 h-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">
            Installer D&D Ultimate Tracker
          </h3>
          <p className="text-red-100 text-sm mb-3">
            {isIOS 
              ? "Ajoutez cette app à votre écran d'accueil pour un accès rapide !"
              : "Installez l'application pour une meilleure expérience !"
            }
          </p>
          
          {isIOS ? (
            <div className="text-red-100 text-xs space-y-1">
              <p>1. Appuyez sur <span className="font-semibold">⎙</span> (partager)</p>
              <p>2. Sélectionnez "Sur l'écran d'accueil"</p>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="bg-white text-red-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-50 transition-colors"
            >
              <Download size={18} />
              Installer maintenant
            </button>
          )}
        </div>
        
        <button
          onClick={handleDismiss}
          className="p-1 text-red-200 hover:text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}