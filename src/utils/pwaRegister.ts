export async function registerPWA() {
  if (typeof window === 'undefined') return;

  try {
    const { registerSW } = await import('virtual:pwa-register');

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] Nouvelle version disponible');
        window.dispatchEvent(new CustomEvent('pwa:need-refresh', {
          detail: { updateSW }
        }));
      },
      onOfflineReady() {
        console.log('[PWA] Application prête hors-ligne');
        window.dispatchEvent(new CustomEvent('pwa:offline-ready'));
      },
      onRegistered(registration) {
        console.log('[PWA] Service Worker enregistré', registration);

        if (registration) {
          setInterval(() => {
            console.log('[PWA] Vérification des mises à jour...');
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.error('[PWA] Erreur enregistrement:', error);
      }
    });

    (window as any).__PWA_UPDATE__ = () => {
      updateSW(true);
    };

  } catch (error) {
    console.log('[PWA] Module non disponible (mode dev ou build sans PWA):', error);
  }
}
