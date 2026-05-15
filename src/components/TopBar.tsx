import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  isNotificationSupported,
  isNotificationMuted,
  setNotificationMuted,
} from '../lib/notifications';
import i18n from '../i18n';

export function TopBar() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(isNotificationMuted);
  const notifSupported =
    isNotificationSupported() && Notification.permission === 'granted';

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setNotificationMuted(next);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('swan-talk-lang', next);
  };

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          className="w-8 h-8 shrink-0"
        />
        <span className="text-lg font-bold text-indigo-600 truncate">
          {t('app.name')}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification mute toggle — only shown if permission was granted */}
        {notifSupported && (
          <button
            onClick={toggleMute}
            title={muted ? t('settings.notifUnmute') : t('settings.notifMute')}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            )}
          </button>
        )}

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors"
          title={t('settings.language')}
        >
          {i18n.language === 'zh' ? 'EN' : '中文'}
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                {user?.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <span
              className="text-sm text-gray-700 hidden sm:block cursor-default"
              title={user?.email}
            >
              {user?.displayName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {t('auth.signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
