/**
 * Gestion PWA (enregistrement du Service Worker et updates).
 * Requiert: vite-plugin-pwa installé et configuré dans vite.config.ts
 *
 * Événements personnalisés émis:
 *  - 'pwa:offline-ready' : le cache est prêt (offline OK)
 *  - 'pwa:need-refresh' : une nouvelle version est disponible
 *
 * Tu peux écouter ces événements côté React pour afficher un toast.
 */

import { registerSW } from 'virtual:pwa-register';

interface PWAUpdateEventDetail {
  update: (reload?: boolean) => void;
}

declare global {
  interface Window {
    __PWA_LAST_CHECK__?: number;
  }
}

const ONE_HOUR = 60 * 60 * 1000;

function emit<T>(name: string, detail?: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function setupPWA() {
  console.log('[PWA] Initialisation…');

  const updateSW = registerSW({
    immediate: false,
    onNeedRefresh() {
      console.log('[PWA] Nouvelle version disponible');
      emit<PWAUpdateEventDetail>('pwa:need-refresh', {
        update: (reload = true) => updateSW(reload)
      });

      // Prompt simple (remplaçable par un toast React)
      if (confirm('Une nouvelle version est disponible. Recharger maintenant ?')) {
        updateSW(true);
      } else {
        console.log('[PWA] L’utilisateur a différé la mise à jour.');
      }
    },
    onOfflineReady() {
      console.log('[PWA] Contenu disponible hors-ligne.');
      emit('pwa:offline-ready');
    },
    onRegisterError(err) {
      console.log('[PWA] Erreur d’enregistrement SW:', err);
    }
  });

  // Vérifications périodiques (ex: chaque heure)
  window.__PWA_LAST_CHECK__ = Date.now();
  setInterval(() => {
    console.log('[PWA] Vérification d’update…');
    updateSW(false);
    window.__PWA_LAST_CHECK__ = Date.now();
  }, ONE_HOUR);
}

setupPWA();