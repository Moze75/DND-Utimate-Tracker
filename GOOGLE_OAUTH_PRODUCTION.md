# Comment mettre votre projet Google OAuth en production

## 1. Accéder à l'écran de consentement OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionnez votre projet
3. Dans le menu de gauche, allez dans **APIs & Services** → **OAuth consent screen**

## 2. Vérifier le statut de publication

### Vous verrez l'un de ces statuts :

#### 🔴 **En test** (Testing)
- Statut affiché : "Testing" ou "En test"
- Seuls les utilisateurs de test peuvent se connecter
- Limitation à 100 utilisateurs maximum

#### 🟢 **En production** (In production)
- Statut affiché : "In production" ou "En production"
- Tous les utilisateurs peuvent se connecter
- Aucune limitation d'utilisateurs

## 3. Passer en production

### Si votre projet est en mode "Test" :

1. **🎯 Cliquez sur "PUBLISH APP"** (ou "PUBLIER L'APPLICATION")
2. **Confirmez** en cliquant sur "CONFIRM" dans la popup

### **🚨 CRITIQUE - Important à savoir :**

- **✅ Pas de vérification Google nécessaire** pour la plupart des applications
- **Changement immédiat** : l'application passe en production instantanément
- **Aucun impact** sur les utilisateurs existants

### **🔍 Comment vérifier que c'est en production :**
1. Allez dans **OAuth consent screen**
2. Regardez le statut en haut de la page
3. Il doit afficher **"In production"** ou **"En production"**
4. Si c'est écrit **"Testing"**, cliquez sur **"PUBLISH APP"**

## 4. Vérifications après publication

### Dans l'écran de consentement OAuth :
- ✅ Le statut doit afficher **"In production"**
- ✅ Vous devriez voir un bouton **"BACK TO TESTING"** (retour en test)

### Test de connexion :
1. **Déconnectez-vous** de votre application
2. **Essayez de vous reconnecter** avec Google
3. **Vérifiez** qu'il n'y a plus d'erreur de redirection

## 5. Cas particuliers

### Si vous voyez "Needs verification" :
- Cela arrive seulement si vous demandez des **scopes sensibles**
- Pour l'authentification basique (email, profil), **aucune vérification n'est nécessaire**
- Vous pouvez publier sans vérification

### Si le bouton "PUBLISH APP" n'apparaît pas :
- Votre app est peut-être **déjà en production**
- Vérifiez le statut en haut de la page

## 6. Scopes utilisés par votre application

Votre application D&D utilise seulement :
- ✅ `email` - Accès à l'adresse email
- ✅ `profile` - Accès au profil de base

Ces scopes sont **non-sensibles** et ne nécessitent **aucune vérification Google**.

## 7. Capture d'écran de référence

Voici ce que vous devriez voir :

```
OAuth consent screen
┌─────────────────────────────────────┐
│ App name: [Votre App]               │
│ Status: In production 🟢            │
│ [BACK TO TESTING] [EDIT APP]        │
└─────────────────────────────────────┘
```

## 8. Dépannage

### Si vous ne trouvez pas l'écran de consentement :
1. Vérifiez que vous êtes dans le **bon projet**
2. Allez dans **APIs & Services** → **OAuth consent screen**

### Si l'erreur persiste après publication :
1. **Attendez 5-10 minutes** (propagation des changements)
2. **Videz le cache** de votre navigateur
3. **Testez en navigation privée**

## 9. Confirmation finale

Une fois en production, testez votre connexion Google :
- ❌ Plus d'erreur "redirect_uri_mismatch"
- ✅ Connexion Google fonctionne normalement
- ✅ Redirection vers votre application réussie