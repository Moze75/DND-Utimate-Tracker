# 🔧 Guide de débogage OAuth Google

## **Étapes de diagnostic**

### **1. Vérifiez la console du navigateur**
1. Ouvrez les outils de développement (F12)
2. Allez dans l'onglet **Console**
3. Tentez de vous connecter avec Google
4. Notez toutes les erreurs affichées

### **2. Vérifiez l'onglet Network**
1. Dans les outils de développement, allez dans **Network**
2. Tentez de vous connecter avec Google
3. Regardez les requêtes qui échouent (en rouge)
4. Cliquez sur les requêtes échouées pour voir les détails

### **3. Erreurs courantes et solutions**

#### **❌ "redirect_uri_mismatch"**
**Cause :** L'URL de redirection ne correspond pas à celle configurée dans Google Cloud Console

**Solution :**
1. Allez dans Google Cloud Console
2. APIs & Services → Credentials
3. Cliquez sur votre OAuth 2.0 Client ID
4. Vérifiez que l'URL de redirection est exactement :
   ```
   https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/callback
   ```

#### **❌ "unauthorized_client"**
**Cause :** Le client OAuth n'est pas autorisé

**Solutions :**
1. Vérifiez que votre projet Google est en **production** (pas en test)
2. Vérifiez que le Client ID dans Supabase correspond à celui de Google Cloud Console

#### **❌ "popup_blocked"**
**Cause :** Le navigateur bloque les popups

**Solution :**
1. Autorisez les popups pour votre site
2. Ou utilisez un autre navigateur

#### **❌ "access_denied"**
**Cause :** L'utilisateur a refusé l'accès ou le projet est en mode test

**Solutions :**
1. Vérifiez que le projet Google est en **production**
2. Si en mode test, ajoutez votre email comme utilisateur de test

### **4. Vérifications dans Supabase**

1. Allez dans **Authentication** → **Providers**
2. Vérifiez que Google est **activé** (toggle ON)
3. Vérifiez que le **Client ID** et **Client Secret** sont corrects
4. L'URL de redirection doit être automatiquement remplie

### **5. Test de configuration**

Utilisez cette URL pour tester votre configuration OAuth :
```
https://yumzqyyogwzrmlcpvnky.supabase.co/auth/v1/authorize?provider=google&redirect_to=http://localhost:5173
```

Si cette URL fonctionne, le problème vient du code frontend.

### **6. Logs détaillés**

Pour activer les logs détaillés, ouvrez la console et tapez :
```javascript
localStorage.setItem('supabase.auth.debug', 'true')
```

Puis rechargez la page et tentez de vous connecter.

### **7. Contact support**

Si le problème persiste, fournissez :
- Capture d'écran de la configuration Google Cloud Console
- Capture d'écran de la configuration Supabase
- Logs de la console du navigateur
- URL exacte où vous testez