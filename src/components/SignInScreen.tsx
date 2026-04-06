import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

function isWebView(): boolean {
  const ua = navigator.userAgent;
  return (
    // Android WebView
    /wv/.test(ua) ||
    // iOS WebView (no Safari in UA, but has AppleWebKit)
    (/iPhone|iPad|iPod/.test(ua) && !/Safari/.test(ua)) ||
    // Common in-app browsers
    /FBAN|FBAV|Instagram|MicroMessenger|Line\//.test(ua)
  );
}

type Mode = 'signin' | 'signup';

export function SignInScreen() {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const inWebView = isWebView();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const withLoading = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    withLoading(async () => {
      if (mode === 'signup') {
        const name = displayName.trim();
        if (!name) { setError(t('auth.nameRequired')); return; }
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    });
  };

  const handleGoogle = () => withLoading(signInWithGoogle);

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-5 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-indigo-600">{t('app.name')}</div>
          <p className="text-gray-500 text-sm mt-1">Real-time team chat</p>
        </div>

        {/* WebView warning */}
        {inWebView && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
            {t('auth.webViewWarning')}
          </div>
        )}

        {/* Google sign-in */}
        <button
          onClick={handleGoogle}
          disabled={loading || inWebView}
          title={inWebView ? t('auth.webViewWarning') : undefined}
          className="flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <GoogleIcon />
          {t('auth.signInWithGoogle')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">{t('auth.or')}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t('auth.displayName')}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.displayNamePlaceholder')}
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              autoFocus={mode === 'signin'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? t('auth.loading')
              : mode === 'signin'
              ? t('auth.signIn')
              : t('auth.signUp')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500">
          {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
          <button
            onClick={switchMode}
            className="text-indigo-600 hover:underline font-medium"
          >
            {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
          </button>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function friendlyError(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    switch ((err as { code: string }).code) {
      case 'auth/invalid-email':         return 'Invalid email address.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':    return 'Incorrect email or password.';
      case 'auth/email-already-in-use':  return 'This email is already registered. Sign in instead.';
      case 'auth/weak-password':         return 'Password must be at least 6 characters.';
      case 'auth/too-many-requests':     return 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':return 'Network error. Check your connection.';
      case 'auth/popup-closed-by-user':  return 'Sign-in popup was closed. Please try again.';
      case 'auth/popup-blocked':         return 'Popup was blocked by your browser. Please allow popups.';
    }
  }
  return 'Something went wrong. Please try again.';
}
