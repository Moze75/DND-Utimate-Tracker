# 🔧 Nettoyage complet de la configuration Google OAuth

## Problème identifié
Malgré les modifications, Google redirige encore vers `localhost:3000` au lieu de votre site de production.

## Solution étape par étape

### 1. **Google Cloud Console - Nettoyage complet**

1. Allez dans [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre **OAuth 2.0 Client ID**

**Supprimez TOUTES les URLs qui contiennent `localhost:3000` :**
- Dans "Origines JavaScript autorisées"
- Dans "URI de redirection autorisés"

**Gardez SEULEMENT ces URLs :**

**Origines JavaScript autorisées :**
```
http://localhost:5173
https://yumzqyyogwzrmlcpvnky.supabase.co
https://superb-horse-1f4661.netlify.app
```

**URI de redirection autorisés :**
```
https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback
```

### 2. **Supabase Dashboard - Vérification**

1. Allez dans **Settings** → **General**
2. Vérifiez que **Site URL** est :
   ```
   https://superb-horse-1f4661.netlify.app
   ```

3. Dans **Additional Redirect URLs**, ajoutez :
   ```
   https://superb-horse-1f4661.netlify.app/**
   http://localhost:5173/**
   ```

### 3. **Test de diagnostic**

Après les modifications, testez en ouvrant la console du navigateur sur votre téléphone et regardez les logs OAuth.

### 4. **Si le problème persiste**

Si vous voyez encore `localhost:3000`, cela peut venir de :

1. **Cache de Google** : Attendez 30 minutes après les modifications
2. **Cache du navigateur** : Videz le cache de Chrome sur votre téléphone
3. **Configuration cachée** : Il peut y avoir une ancienne configuration OAuth quelque part

### 5. **Solution de dernier recours**

Si rien ne fonctionne, créez un **nouveau Client OAuth** dans Google Cloud Console :

1. **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
3. Configurez SEULEMENT les bonnes URLs dès le départ
4. Mettez à jour le Client ID dans Supabase

## URLs de référence correctes

**Google Cloud Console - Origines JavaScript :**
- `http://localhost:5173`
- `https://yumzqyyogwzrmlcpvnky.supabase.co`
- `https://superb-horse-1f4661.netlify.app`

**Google Cloud Console - Redirections :**
- `https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback`

**Supabase - Site URL :**
- `https://superb-horse-1f4661.netlify.app`