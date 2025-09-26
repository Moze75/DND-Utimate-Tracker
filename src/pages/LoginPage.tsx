import React, { useState, useEffect } from 'react';
import { testConnection } from '../lib/supabase';
import { LogIn, Mail, Lock, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Image de fond (env optionnelle VITE_LOGIN_BG_URL)
  const BG_URL =
    (import.meta as any)?.env?.VITE_LOGIN_BG_URL ||
    'https://yumzqyyogwzrmlcpvnky.supabase.co/storage/v1/object/public/static/tmpoofee5sh.png';

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${BG_URL})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundColor: 'transparent',
  };

  useEffect(() => {
    // Vérifier si on revient d'une confirmation d'email
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');
    
    if (error === 'access_denied' && errorCode === 'otp_expired') {
      toast.error('Le lien de confirmation a expiré. Veuillez créer un nouveau compte ou demander un nouveau lien.');
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      toast.error(`Erreur de confirmation: ${errorDescription || error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      try {
        const result = await testConnection();
        if (!result.success) {
          setConnectionError(result.error || 'Impossible de se connecter à la base de données');
          toast.error(result.error || 'Erreur de connexion');
        } else {
          setConnectionError(null);
        }
      } catch (error: any) {
        setConnectionError('Erreur lors de la vérification de la connexion');
        toast.error('Erreur de connexion');
      } finally {
        setIsCheckingConnection(false);
      }
    };
    
    checkConnection();
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setConnectionError(null);

    try {
      const { error } = await authService.signInWithEmail(email, password);

      if (error) throw error;
      toast.success('Connexion réussie');
    } catch (error: any) {
      console.error('Erreur de connexion:', error);
      const errorMessage = error.message === 'Failed to fetch' 
        ? 'Impossible de se connecter au serveur. Vérifiez votre connexion Internet.'
        : error.message?.includes('Veuillez confirmer votre adresse email')
        ? 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception et le dossier spam.'
        : error.message || 'Erreur de connexion';
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    setIsLoading(true);

    try {
      const { error } = await authService.signUp(email, password);

      if (error) throw error;
      setSignUpSuccess(true);
      toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
    } catch (error: any) {
      console.error('Erreur d\'inscription:', error);
      if (error.message.includes('User already registered')) {
        toast.error('Un compte existe déjà avec cette adresse email');
      } else if (error.message.includes('Invalid email')) {
        toast.error('Adresse email invalide');
      } else if (error.message.includes('Veuillez confirmer votre adresse email')) {
        toast.error('Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception et le dossier spam.');
      } else {
        toast.error(error.message || 'Erreur d\'inscription');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await authService.signInWithGoogle();

      if (error) {
        console.error('=== GOOGLE OAUTH ERROR ===');
        console.error('Error details:', error);
        console.error('Error code:', error.status);
        console.error('Error name:', error.name);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('=== GOOGLE OAUTH SUCCESS ===');
      console.log('OAuth flow initiated successfully');
    } catch (error: any) {
      console.error('=== GOOGLE SIGN IN FAILED ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Messages d'erreur plus spécifiques
      if (error.message?.includes('redirect_uri_mismatch')) {
        toast.error('Configuration OAuth incorrecte. Consultez le fichier README_OAUTH_CONFIG.md pour la configuration.');
      } else if (error.message?.includes('unauthorized_client')) {
        toast.error('Client OAuth non autorisé. Vérifiez la configuration dans Supabase.');
      } else if (error.message?.includes('popup_blocked')) {
        toast.error('Popup bloqué par le navigateur. Autorisez les popups pour ce site.');
      } else if (error.message?.includes('network')) {
        toast.error('Erreur réseau. Vérifiez votre connexion Internet.');
      } else if (error.message?.includes('Veuillez confirmer votre adresse email')) {
        toast.error('Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception et le dossier spam.');
      } else if (error.name === 'EmailNotConfirmed') {
        toast.error(error.message);
      } else {
        toast.error(`Erreur de connexion Google: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setSignUpSuccess(false);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };

  if (isCheckingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-200">Vérification de la connexion...</p>
        </div>
      </div>
    );
  }

  if (signUpSuccess) {
    return (
      <div className="login-page min-h-screen flex items-center justify-center p-4" style={bgStyle}>
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-6" style={{
              textShadow: `
                0 0 15px rgba(255, 255, 255, 0.9),
                0 0 20px rgba(255, 255, 255, 0.6),
                0 0 30px rgba(255, 255, 255, 0.4),
                0 0 40px rgba(255, 255, 255, 0.2)
              `
            }}>
              Vérifiez votre email
            </h1>
          </div>

          <div className="stat-card">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-500" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-100">
                Email de confirmation envoyé !
              </h2>
              
              <p className="text-gray-300">
                Nous avons envoyé un email de confirmation à :
              </p>
              
              <p className="text-blue-400 font-medium">
                {email}
              </p>
              
              <p className="text-gray-400 text-sm">
                Cliquez sur le lien dans l'email pour activer votre compte, puis revenez ici pour vous connecter.
              </p>
              
              <button
                onClick={() => {
                  setSignUpSuccess(false);
                  setIsSignUp(false);
                  resetForm();
                }}
                className="btn-primary w-full px-4 py-2 rounded-lg mt-6"
              >
                Retour à la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center p-4" style={bgStyle}>
      <div className="w-full max-w-md space-y-8">
        {connectionError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-500 text-sm">{connectionError}</p>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-6" style={{
            textShadow: `
              0 0 15px rgba(255, 255, 255, 0.9),
              0 0 20px rgba(255, 255, 255, 0.6),
              0 0 30px rgba(255, 255, 255, 0.4),
              0 0 40px rgba(255, 255, 255, 0.2)
            `
          }}>
            <div className="leading-tight">D&D</div>
            <div className="leading-tight">Ultimate Tracker</div>
          </h1>
          <p className="text-gray-200 mb-2" style={{
            textShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
          }}>
            {isSignUp ? 'Créez votre compte' : 'Gérez vos personnages et vos parties'}
          </p>
        </div>

        <div className="stat-card">
          <div className="p-6 space-y-6">
            <form className="space-y-4" onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn}>
              <h3 className="text-lg font-semibold text-gray-100 text-center">
                {isSignUp ? 'Créer un compte' : 'Se connecter'}
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-dark w-full pl-10 pr-3 py-2 rounded-lg"
                    placeholder="vous@exemple.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-dark w-full pl-10 pr-3 py-2 rounded-lg"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-dark w-full pl-10 pr-3 py-2 rounded-lg"
                      placeholder="••••••••"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading || !!connectionError}
                  className="btn-primary w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />}
                  {isSignUp ? 'Créer le compte' : 'Se connecter'}
                </button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={switchMode}
                    disabled={isLoading}
                    className="text-blue-400 hover:text-blue-300 text-sm disabled:opacity-50"
                  >
                    {isSignUp 
                      ? 'Déjà un compte ? Se connecter' 
                      : 'Pas de compte ? Créer un compte'
                    }
                  </button>
                </div>
              </div>
              
              {isSignUp && (
                <div className="text-xs text-gray-400 text-center">
                  En créant un compte, vous acceptez nos conditions d'utilisation.
                  <br />
                  Un email de confirmation sera envoyé à votre adresse.
                </div>
              )}
            </form>

            {!isSignUp && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-800 text-gray-400">
                      Ou continuer avec
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={!!connectionError}
                  className="w-full px-4 py-2 rounded-lg bg-white hover:bg-gray-100 text-gray-900 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}