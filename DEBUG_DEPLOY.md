# 🚨 Guide de Debug - Problème de Déploiement

## Problème Identifié

Le dossier `dist/` est dans le `.gitignore`, donc Netlify ne peut pas le déployer directement via Git.

## ✅ Solution Appliquée : netlify.toml

J'ai créé un fichier `netlify.toml` qui indique à Netlify de :
1. **Builder le projet** : `npm run build`
2. **Publier** le dossier `dist/`
3. **Configurer** les redirections et headers

## 🔍 Diagnostics à Effectuer

### 1. Quel est votre message d'erreur exact ?

**Sur Netlify, l'erreur ressemble à :**
- ❌ "Build failed" → Erreur de compilation
- ❌ "Deploy failed" → Erreur de déploiement
- ❌ "Page not found" → Problème de configuration
- ❌ Autre chose ?

### 2. Comment déployez-vous ?

**Option A : Via Git Push**
```bash
git add .
git commit -m "Fix: Add netlify.toml"
git push origin main
```
⚠️ Netlify doit être configuré pour auto-build depuis Git

**Option B : Via Netlify CLI**
```bash
# Si pas installé
npm install -g netlify-cli

# Login (une seule fois)
netlify login

# Déployer
netlify deploy --prod
```

**Option C : Drag & Drop du dossier dist/**
1. `npm run build` localement
2. Glisser le dossier `dist/` sur https://app.netlify.com

### 3. Vérifier les Logs Netlify

1. Aller sur https://app.netlify.com
2. Cliquer sur votre site
3. Onglet "Deploys"
4. Cliquer sur le dernier deploy raté
5. Lire les logs d'erreur

## 🔧 Solutions selon l'Erreur

### Erreur : "Command not found: npm"

**Solution** : Netlify doit installer Node.js

Vérifier que `netlify.toml` contient :
```toml
[build.environment]
  NODE_VERSION = "18"
```

### Erreur : "Module not found: virtual:pwa-register"

**Cause** : Problème avec vite-plugin-pwa

**Solution 1 - Temporaire** : Désactiver le PWA
```bash
# Dans vite.config.ts, commenter le plugin PWA
# Rebuild et redéployer
```

**Solution 2 - Permanente** : Vérifier les dépendances
```bash
npm install
npm run build
# Si ça marche localement, problème côté Netlify
```

### Erreur : "ENOENT: no such file or directory"

**Cause** : Fichier manquant

**Solution** :
```bash
# Vérifier que tous les fichiers existent
ls -la public/icon-192.png
ls -la public/icon-512.png
ls -la public/apple-touch-icon.png

# Si manquants, ils sont référencés mais inexistants
```

### Erreur : Build réussit mais page blanche

**Cause** : Problème de routes ou d'assets

**Debug** :
1. F12 → Console → Voir les erreurs
2. F12 → Network → Voir les 404

**Solutions possibles** :
- Vérifier `base` dans vite.config.ts
- Vérifier les redirections dans netlify.toml
- Vérifier les imports

### Erreur : "Failed to fetch" ou problème CORS

**Cause** : Variables d'environnement Supabase manquantes

**Solution** :
1. Netlify Dashboard → Site settings
2. Build & deploy → Environment
3. Ajouter :
   - `VITE_SUPABASE_URL` = votre_url
   - `VITE_SUPABASE_ANON_KEY` = votre_key

## 🧪 Test Local Avant Déploiement

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Build
npm run build

# 3. Vérifier dist/
ls -la dist/

# Doit contenir :
# ✅ index.html
# ✅ sw.js
# ✅ manifest.webmanifest
# ✅ _headers
# ✅ _redirects
# ✅ assets/ (dossier)

# 4. Preview local
npm run preview
# Ouvrir http://localhost:4173
# Tester l'application
```

## 🆘 Si Toujours Bloqué

### Option 1 : Revenir en Arrière (Sans PWA)

Si le PWA est le problème, on peut le désactiver temporairement :

1. **Commenter dans `vite.config.ts` :**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa'; // ← Commenter
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // VitePWA({ ... }), // ← Commenter tout le bloc
  ],
  // ... reste inchangé
});
```

2. **Commenter dans `src/main.tsx` :**
```typescript
// import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
// import { registerPWA } from './utils/pwaRegister';

// registerPWA(); // ← Commenter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* <PWAUpdatePrompt /> */}
  </StrictMode>
);
```

3. **Rebuild et redéployer**
```bash
npm run build
netlify deploy --prod
```

### Option 2 : Déploiement Manuel

Si Netlify auto-build ne fonctionne pas :

```bash
# Build localement
npm run build

# Déployer manuellement
netlify deploy --prod --dir=dist
```

## 📋 Checklist Avant de Demander de l'Aide

Quand vous me recontactez, merci de fournir :

- [ ] Message d'erreur exact (copier-coller)
- [ ] Logs Netlify (les 20 dernières lignes)
- [ ] Méthode de déploiement (Git/CLI/drag-drop)
- [ ] Screenshot de l'erreur si possible
- [ ] Résultat de `npm run build` en local (succès/échec)

## 🎯 Actions Immédiates

**1. Commiter le netlify.toml :**
```bash
git add netlify.toml
git commit -m "Add Netlify configuration"
git push origin main
```

**2. Sur Netlify Dashboard :**
- Vérifier que "Build command" = `npm run build`
- Vérifier que "Publish directory" = `dist`
- Vérifier que les variables d'environnement sont définies

**3. Tester en local :**
```bash
npm run build && npm run preview
```

Si ça marche en local mais pas sur Netlify, c'est un problème de **configuration Netlify** ou de **variables d'environnement**.

---

**Dites-moi :**
1. Quel est le message d'erreur exact ?
2. Déployez-vous via Git, CLI ou drag-drop ?
3. Est-ce que `npm run build` fonctionne en local ?
