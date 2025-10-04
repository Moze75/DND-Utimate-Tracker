# Guide de Déploiement PWA - Corrections Appliquées

## Problème Résolu

L'application se bloquait au chargement en mode PWA installé à cause d'un Service Worker mal configuré qui cachait une version obsolète.

## Corrections Appliquées

### 1. Fichiers Modifiés

#### `package.json`
- ✅ Ajout de `vite-plugin-pwa` et `workbox-window`

#### `vite.config.ts`
- ✅ Configuration complète du plugin PWA
- ✅ Stratégie NetworkFirst pour Supabase (5min cache)
- ✅ Stratégie CacheFirst pour les images (30 jours)
- ✅ Nettoyage automatique des anciens caches

#### `index.html`
- ✅ Suppression du code d'enregistrement manuel du SW défectueux

#### `src/App.tsx`
- ✅ Ajout détection de timeout après 15 secondes
- ✅ Bouton "Nettoyer le cache et recharger" en cas de blocage

#### `src/main.tsx`
- ✅ Intégration du nouveau système PWA
- ✅ Initialisation des outils de diagnostic

#### `public/manifest.webmanifest`
- ✅ Ajout des propriétés manquantes (scope, dir, lang, categories)
- ✅ Correction des chemins d'icônes

### 2. Nouveaux Fichiers

#### `src/components/PWAUpdatePrompt.tsx`
- Notification élégante pour les mises à jour
- Écoute des événements personnalisés `pwa:need-refresh`

#### `src/utils/pwaRegister.ts`
- Enregistrement propre du Service Worker
- Émission d'événements pour les updates
- Vérification automatique toutes les heures

#### `src/utils/pwaCleanup.ts`
- Fonctions de nettoyage du cache
- Outils de diagnostic accessibles via console
- `window.__PWA_CLEANUP__()` pour nettoyer manuellement

#### `public/_headers`
- Configuration Netlify pour le Service Worker
- Headers de sécurité appropriés
- Cache-Control correct pour sw.js

#### `public/_redirects`
- Redirection SPA pour Netlify

### 3. Fichiers Supprimés

- ❌ `manifest.json` (doublon à la racine)
- ❌ `src/pwa.ts` (ancien système incompatible)

## Comment Déployer sur Netlify

### Étape 1 : Build Local
```bash
npm run build
```

### Étape 2 : Vérifier le Dossier dist/
Le dossier `dist/` doit contenir :
- ✅ `sw.js` (Service Worker)
- ✅ `workbox-*.js` (Workbox runtime)
- ✅ `manifest.webmanifest`
- ✅ `_headers` (configuration Netlify)
- ✅ `_redirects` (configuration Netlify)

### Étape 3 : Déployer
Trois options :

**Option A : Via Netlify CLI**
```bash
netlify deploy --prod --dir=dist
```

**Option B : Via Git Push**
```bash
git add .
git commit -m "Fix: PWA configuration and deployment"
git push origin main
```

**Option C : Via Drag & Drop**
1. Aller sur https://app.netlify.com
2. Glisser-déposer le dossier `dist/`

## Fonctionnalités PWA

### Cache Intelligent
- **API Supabase** : NetworkFirst avec timeout 10s
- **Images** : CacheFirst (30 jours)
- **Nettoyage automatique** des anciens caches

### Détection de Blocage
Si l'app ne charge pas après 15 secondes :
- Message d'avertissement affiché
- Bouton "Recharger la page"
- Bouton "Nettoyer le cache et recharger"

### Outils de Diagnostic
Ouvrir la console développeur (F12) :

```javascript
// Vérifier le statut PWA
await window.__PWA_STATUS__()

// Nettoyer tous les caches et SW
await window.__PWA_CLEANUP__()

// Forcer une mise à jour
window.__PWA_UPDATE__()
```

### Mises à Jour
- Vérification automatique toutes les heures
- Notification élégante en bas à droite
- Options : "Mettre à jour maintenant" ou "Plus tard"

## Pour les Utilisateurs Bloqués

### Solution 1 : Via l'Interface
1. Attendre 15 secondes que le message apparaisse
2. Cliquer sur "Nettoyer le cache et recharger"

### Solution 2 : Via la Console
1. Ouvrir les Outils de Développement (F12)
2. Onglet Console
3. Taper : `window.__PWA_CLEANUP__()`
4. Recharger la page

### Solution 3 : Manuellement
1. Ouvrir les Outils de Développement (F12)
2. Onglet "Application" (Chrome) ou "Stockage" (Firefox)
3. Cliquer sur "Service Workers"
4. Cliquer "Unregister" sur tous les SW
5. Onglet "Cache Storage"
6. Supprimer tous les caches
7. Recharger la page

## Logique Préservée

✅ Toute votre logique métier est intacte :
- Sauvegarde automatique du dernier personnage (localStorage)
- Synchronisation Supabase en temps réel
- Navigation et états préservés
- Aucune modification des composants de jeu

Les modifications touchent uniquement :
- La gestion du cache PWA
- La détection des problèmes de chargement
- Les notifications de mise à jour

## Vérification Post-Déploiement

1. **Ouvrir l'app sur Netlify**
2. **Console Développeur** : Vérifier les logs
   ```
   [PWA] Service Worker enregistré
   [PWA] Application prête hors-ligne
   ```
3. **Mode Hors-ligne** :
   - Activer le mode avion
   - Recharger l'app
   - Elle doit fonctionner
4. **Lighthouse** : Score PWA > 90

## Problèmes Potentiels

### Service Worker ne s'enregistre pas
- Vérifier que HTTPS est actif (requis pour SW)
- Vérifier les logs console pour les erreurs
- S'assurer que `sw.js` est accessible à `/sw.js`

### Cache ne se met pas à jour
- Les mises à jour sont détectées automatiquement
- Forcer : `window.__PWA_UPDATE__()`
- En dernier recours : `window.__PWA_CLEANUP__()`

### Build échoue
- Supprimer `node_modules/` et `package-lock.json`
- Réinstaller : `npm install`
- Rebuilder : `npm run build`

## Support

Pour tout problème :
1. Vérifier les logs console (F12)
2. Exécuter `window.__PWA_STATUS__()`
3. Si bloqué : `window.__PWA_CLEANUP__()`
