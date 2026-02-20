import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { UserPlan, PLAN_LIMITS } from '../types';

interface HeaderProps {
  onGoHome: () => void;
  onGoDashboard: () => void;
  onGoSettings: () => void;
  onLogin: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  userPlan?: UserPlan;
}

const PLAN_BADGE_STYLES: Record<UserPlan, string> = {
  starter: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  premium: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

export const Header: React.FC<HeaderProps> = ({ onGoHome, onGoDashboard, onGoSettings, onLogin, theme, onToggleTheme, userPlan = 'starter' }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200 dark:border-slate-700 px-6 py-1 flex items-center justify-between">
      <div
        className="flex items-center space-x-3 cursor-pointer group"
        onClick={onGoHome}
        onKeyDown={(e) => e.key === 'Enter' && onGoHome()}
        role="button"
        tabIndex={0}
        aria-label="Go to home page"
      >
        <div className="w-20 h-20 rounded-2xl overflow-hidden transition-transform group-hover:scale-110 bg-white dark:bg-slate-800">
          <img
            src="/logo.png"
            alt="MockMentor Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
            MockMentor
          </span>
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
            AI Interview Coach
          </span>
        </div>
      </div>

      <nav className="flex items-center space-x-4 md:space-x-6" aria-label="Main navigation">
        <button
          onClick={onGoDashboard}
          className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Progress
        </button>

        <button
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          )}
        </button>

        {user ? (
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${PLAN_BADGE_STYLES[userPlan]}`}>
              {PLAN_LIMITS[userPlan].label}
            </span>
            <button
              onClick={onGoSettings}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Settings"
              aria-label="Go to settings"
            >
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 overflow-hidden bg-blue-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user.displayName || 'U').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="hidden md:block text-xs font-bold text-slate-700 dark:text-slate-300">
                {user.displayName?.split(' ')[0] || 'User'}
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="px-5 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-200 dark:shadow-none active:scale-95"
          >
            Login
          </button>
        )}
      </nav>
    </header>
  );
};
