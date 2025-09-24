import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/**
 * Configuration PWA:
 * - registerType 'autoUpdate' : le SW vérifie régulièrement les updates et se met à jour.
 * - workbox.globPatterns : géré automatiquement pour pré-cacher les assets buildés.
 * - devOptions.enabled : permet de tester partiellement en dev (peut être mis à false si gênant).
 *
 * Notes:
 * - Assure-toi que public/manifest.webmanifest existe déjà (c’est ton cas).
 * - Le plugin peut générer un manifest si tu n’en mets pas, mais ici on le laisse.
 * - Ajoute dans ton index.html: <link rel="manifest" href="/manifest.webmanifest">
 */
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        // Active un SW simplifié en dev pour tester (sinon mettre false)
        devOptions: {
          enabled: true,
          /* logInactive: true, */
          navigateFallback: 'index.html'
        },
        // Laisse le manifest existant (sinon tu peux aussi le définir ici).
        manifest: undefined,
        workbox: {
          // Patterns par défaut: build assets. On peut préciser si tu ajoutes d'autres répertoires.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // Exemples de runtime caching Supabase (optionnel)
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/([^.]+\.)?supabase\.co\/rest\/v1\/.*$/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest',
                networkTimeoutSeconds: 8,
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 10 // 10 minutes
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/([^.]+\.)?supabase\.co\/storage\/v1\/object\/public\/.*$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'supabase-storage',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 12 // 12h
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        },
        // Ajoute tes assets "public/" non hashés à inclure dans le precache
        includeAssets: [
          'favicon-16x16.png',
          'favicon-32x32.png',
          'apple-touch-icon.png',
          'icon-192.png',
          'icon-512.png',
          'maskable-512.png'
        ]
      })
    ],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        '@': path.resolve(__dirname, 'src')
      }
    },
    // Optionnel: pré-optimisation
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    build: {
      sourcemap: isDev ? true : false,
      target: 'es2020',
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      port: 5173,
      host: true
    },
    preview: {
      port: 4173
    }
  };
});