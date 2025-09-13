# Configuration Google OAuth pour D&D Ultimate Tracker

## **🚨 DIAGNOSTIC DES PROBLÈMES COURANTS**

### **1. Vérifiez d'abord ces points :**
- ✅ Votre projet Google OAuth est-il en **production** ? (voir GOOGLE_OAUTH_PRODUCTION.md)
- ✅ Les URLs sont-elles exactement comme indiqué ci-dessous ?
- ✅ Avez-vous bien sauvegardé la configuration dans Google Cloud Console ?
- ✅ Avez-vous bien sauvegardé la configuration dans Supabase ?

### **2. Test rapide :**
1. Ouvrez la console du navigateur (F12)
2. Tentez de vous connecter avec Google
3. Regardez les erreurs dans l'onglet Console
4. Regardez les requêtes dans l'onglet Network

## 1. Configuration dans Google Cloud Console

### Accédez à votre projet Google Cloud Console :
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur votre **OAuth 2.0 Client ID**

### Configurez les URLs autorisées :

#### Authorized JavaScript origins :
```
http://localhost:5173
https://yumzqyyogwzrmlcpvnky.supabase.co
```

#### Authorized redirect URIs :
```
https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback
```

**🔥 CRITIQUE** : L'URL de redirection doit être EXACTEMENT celle-ci, sans espace ni caractère supplémentaire.

### **Vérification des URLs :**
- ❌ `https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback/` (avec slash final)
- ✅ `https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback` (sans slash final)
- ❌ Espaces avant ou après l'URL
- ✅ URL exacte sans espaces

## 2. Configuration dans Supabase Dashboard

### Accédez à votre projet Supabase :
1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Authentication** → **Providers**
4. Cliquez sur **Google**

### Configurez le provider Google :
1. **Activez** le provider Google (toggle ON)
2. **Client ID** : Copiez votre Client ID depuis Google Cloud Console
3. **Client Secret** : Copiez votre Client Secret depuis Google Cloud Console
4. **Redirect URL** : Doit être automatiquement rempli avec :
   ```
   https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback
   ```

## 3. Vérifications importantes

### Dans Google Cloud Console :
- ✅ Vérifiez que votre projet OAuth est en **production** (pas en test)
- ✅ Vérifiez que les URLs sont exactement comme indiqué ci-dessus
- ✅ Assurez-vous qu'il n'y a pas d'espaces avant/après les URLs

### Dans Supabase :
- ✅ Le provider Google est activé
- ✅ Les clés Client ID et Client Secret sont correctes
- ✅ L'URL de redirection est exactement celle fournie par Supabase

## 4. Test

1. **Testez d'abord en local** : `http://localhost:5173`
2. **Puis testez en production** : votre URL de déploiement

## 5. Dépannage

Si vous avez encore des problèmes :

1. **Vérifiez les logs dans Supabase** :
   - Allez dans **Logs** → **Auth logs**
   - Regardez les erreurs lors de la tentative de connexion

2. **Vérifiez la console du navigateur** :
   - Ouvrez les outils de développement (F12)
   - Regardez l'onglet **Network** lors de la tentative de connexion
   - Notez toute erreur 400, 401, ou 403

3. **URLs communes qui causent des problèmes** :
   - ❌ `https://yumzqyyogwzrmlcpvnky.supabase.co/` (avec slash final)
   - ✅ `https://yumzqyyogwzrmlcpvnky.supabase.co` (sans slash final)
   - ❌ `https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback/` (avec slash final)
   - ✅ `https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback` (sans slash final)

## 6. Contact

Si le problème persiste après avoir suivi ces étapes, fournissez :
- Une capture d'écran de votre configuration Google Cloud Console
- Une capture d'écran de votre configuration Supabase
- Les erreurs exactes dans la console du navigateur