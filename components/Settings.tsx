import React, { useState, useEffect } from 'react';
import { type User, deleteUser, reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { UserPlan, PLAN_LIMITS, InterviewResult, UserPreferences, ExperienceLevel, InterviewMode } from '../types';
import { persistenceService } from '../services/persistenceService';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

interface SettingsProps {
  user: User;
  userPlan: UserPlan;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSignOut: () => void;
  history: InterviewResult[];
  onClearHistory: () => void;
  userPreferences: UserPreferences | null;
  onSavePreferences: (prefs: UserPreferences) => Promise<void>;
}

const PLAN_BADGE_STYLES: Record<UserPlan, string> = {
  starter: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  premium: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

export const Settings: React.FC<SettingsProps> = ({
  user,
  userPlan,
  theme,
  onToggleTheme,
  onSignOut,
  history,
  onClearHistory,
  userPreferences,
  onSavePreferences,
}) => {
  const [sessionCount, setSessionCount] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [prefJobTitle, setPrefJobTitle] = useState(userPreferences?.jobTitle ?? '');
  const [prefLevel, setPrefLevel] = useState<ExperienceLevel>(userPreferences?.level ?? ExperienceLevel.MID);
  const [prefMode, setPrefMode] = useState<InterviewMode>(userPreferences?.mode ?? InterviewMode.BEHAVIORAL);
  const [prefQuestionCount, setPrefQuestionCount] = useState(userPreferences?.defaultQuestionCount ?? 3);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefSaved, setPrefSaved] = useState(false);

  const planLimits = PLAN_LIMITS[userPlan];

  useEffect(() => {
    if (userPreferences) {
      setPrefJobTitle(userPreferences.jobTitle);
      setPrefLevel(userPreferences.level);
      setPrefMode(userPreferences.mode);
      setPrefQuestionCount(userPreferences.defaultQuestionCount);
    }
  }, [userPreferences]);

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    await onSavePreferences({ jobTitle: prefJobTitle.trim() || 'Software Engineer', level: prefLevel, mode: prefMode, defaultQuestionCount: prefQuestionCount });
    setPrefSaving(false);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2000);
  };

  useEffect(() => {
    persistenceService.getMonthlyInterviewCount().then(setSessionCount);
  }, [history.length]);

  const handleClearHistory = () => {
    onClearHistory();
    setShowClearConfirm(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      // Re-authenticate first
      const providerData = user.providerData[0];
      if (providerData?.providerId === 'google.com') {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else if (deletePassword) {
        const credential = EmailAuthProvider.credential(user.email!, deletePassword);
        await reauthenticateWithCredential(user, credential);
      } else {
        setDeleteError('Please enter your password to confirm deletion.');
        setDeleteLoading(false);
        return;
      }

      // Delete all Firestore data under users/{uid}
      const subcollections = ['interviews', 'sessions', 'profile'];
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, 'users', user.uid, sub));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }

      // Delete Firebase Auth account
      await deleteUser(user);
      // onSignOut will be triggered by onAuthStateChanged
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setDeleteError('Incorrect password. Please try again.');
      } else if (e.code === 'auth/requires-recent-login') {
        setDeleteError('Please sign out and sign back in before deleting your account.');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportData = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockmentor-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Settings</h1>

      {/* Account Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Account</h2>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 overflow-hidden">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span>{(user.displayName || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {user.displayName || 'User'}
            </p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              {user.email || 'No email'}
            </p>
          </div>
        </div>
      </div>

      {/* Plan & Usage Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Plan & Usage</h2>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Current Plan</span>
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${PLAN_BADGE_STYLES[userPlan]}`}>
              {planLimits.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Sessions Used</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {sessionCount}
              <span className="text-base font-bold text-slate-400">
                /{planLimits.sessionLimit === null ? '∞' : planLimits.sessionLimit}
              </span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">This month</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Questions/Session</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {planLimits.maxQuestionsPerSession}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Time/Answer</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {planLimits.questionTimeLimitCap}<span className="text-base font-bold text-slate-400">s</span>
            </p>
          </div>
        </div>

        {userPlan === 'starter' && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
              Upgrade to Professional for more sessions, questions, and detailed feedback.
            </p>
          </div>
        )}
      </div>

      {/* Interview Defaults Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Interview Defaults</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Target Job Title</label>
            <input
              type="text"
              value={prefJobTitle}
              onChange={(e) => setPrefJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Experience Level</label>
            <div className="flex gap-2">
              {Object.values(ExperienceLevel).map((lvl) => (
                <button key={lvl} onClick={() => setPrefLevel(lvl)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${prefLevel === lvl ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Interview Type</label>
            <div className="flex gap-2">
              {Object.values(InterviewMode).map((m) => (
                <button key={m} onClick={() => setPrefMode(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${prefMode === m ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Default Questions per Session</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].filter((n) => n <= planLimits.maxQuestionsPerSession).map((n) => (
                <button key={n} onClick={() => setPrefQuestionCount(n)}
                  className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${prefQuestionCount === n ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSavePreferences}
            disabled={prefSaving}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {prefSaved ? 'Saved!' : prefSaving ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Preferences</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Theme</p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Switch between light and dark mode</p>
          </div>
          <button
            onClick={onToggleTheme}
            className="relative w-14 h-8 rounded-full transition-colors duration-300"
            style={{ backgroundColor: theme === 'dark' ? '#3b82f6' : '#cbd5e1' }}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            <div
              className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center"
              style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(4px)' }}
            >
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Data Management</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Export Interview Data</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Download all your session history as JSON</p>
            </div>
            <button
              onClick={handleExportData}
              disabled={history.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export
            </button>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Clear Interview History</p>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {history.length} session{history.length !== 1 ? 's' : ''} in your account
                </p>
              </div>
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearHistory}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={history.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-red-100 dark:border-red-900/40 p-8 mb-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-red-400 mb-6">Danger Zone</h2>
        {!showDeleteConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Delete Account</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); setDeletePassword(''); }}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              This will permanently delete your account and all interview history. This cannot be undone.
            </p>
            {user.providerData[0]?.providerId !== 'google.com' && (
              <input
                type="password"
                placeholder="Enter your password to confirm"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-sm"
              />
            )}
            {deleteError && (
              <p className="text-xs font-bold text-red-500">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      <button
        onClick={onSignOut}
        className="w-full py-4 rounded-3xl font-black text-base text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
};
