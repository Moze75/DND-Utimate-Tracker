<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <title>D&D Ultimate Tracker</title>

    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <!-- On ne lie PAS de manifest ici si on veut désactiver la PWA -->
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
    <meta http-equiv="Pragma" content="no-cache" />
    <meta http-equiv="Expires" content="0" />

    <meta name="color-scheme" content="dark light" />
    <meta name="theme-color" content="#111827" />
    <meta name="navbutton-color" content="#111827" />
    <meta name="msapplication-navbutton-color" content="#111827" />
  </head>
  <body>
    <div id="root"></div>

    <script type="module" src="/src/main.tsx?v=disable-pwa"></script>

    <script>
      (async function disablePWA() {
        try {
          // NE nettoie pas si l'app est ouverte en mode installé (standalone)
          if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
            return;
          }
          window.addEventListener(
            'beforeinstallprompt',
            (e) => {
              e.preventDefault();
              return false;
            },
            { once: true }
          );
          if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            for (const reg of regs) {
              try { await reg.unregister(); } catch (_) {}
            }
          }
          if (window.caches && caches.keys) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch (_) {
          // silencieux
        }
      })();
    </script>
  </body>
</html>