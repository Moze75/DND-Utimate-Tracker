export async function cleanupOldServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA Cleanup] Service Worker non supporté');
    return { success: true, message: 'Service Worker non supporté' };
  }

  try {
    console.log('[PWA Cleanup] Début du nettoyage...');

    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`[PWA Cleanup] ${registrations.length} service worker(s) trouvé(s)`);

    if (registrations.length === 0) {
      return { success: true, message: 'Aucun service worker à nettoyer' };
    }

    let unregistered = 0;
    for (const registration of registrations) {
      const success = await registration.unregister();
      if (success) {
        unregistered++;
        console.log('[PWA Cleanup] Service Worker désinscrit:', registration.scope);
      }
    }

    const cacheNames = await caches.keys();
    console.log(`[PWA Cleanup] ${cacheNames.length} cache(s) trouvé(s)`);

    let deletedCaches = 0;
    for (const cacheName of cacheNames) {
      const deleted = await caches.delete(cacheName);
      if (deleted) {
        deletedCaches++;
        console.log('[PWA Cleanup] Cache supprimé:', cacheName);
      }
    }

    console.log('[PWA Cleanup] Nettoyage terminé', {
      serviceWorkers: unregistered,
      caches: deletedCaches
    });

    return {
      success: true,
      message: `Nettoyage réussi: ${unregistered} SW, ${deletedCaches} caches supprimés`
    };
  } catch (error) {
    console.error('[PWA Cleanup] Erreur:', error);
    return {
      success: false,
      message: `Erreur lors du nettoyage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

export async function checkServiceWorkerStatus() {
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      registrations: [],
      caches: []
    };
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = await caches.keys();

    const status = {
      supported: true,
      registrations: registrations.map(reg => ({
        scope: reg.scope,
        active: !!reg.active,
        waiting: !!reg.waiting,
        installing: !!reg.installing
      })),
      caches: cacheNames
    };

    console.log('[PWA Status]', status);
    return status;
  } catch (error) {
    console.error('[PWA Status] Erreur:', error);
    return {
      supported: true,
      registrations: [],
      caches: [],
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

export function initPWADiagnostic() {
  if (typeof window === 'undefined') return;

  (window as any).__PWA_CLEANUP__ = cleanupOldServiceWorkers;
  (window as any).__PWA_STATUS__ = checkServiceWorkerStatus;

  console.log('[PWA Diagnostic] Fonctions disponibles:');
  console.log('  - window.__PWA_CLEANUP__() : Nettoyer les anciens SW et caches');
  console.log('  - window.__PWA_STATUS__() : Vérifier le statut actuel');
}
