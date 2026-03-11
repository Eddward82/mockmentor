import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { Login } from './components/Login';

// Lazy-loaded heavy components for code splitting
const SetupWizard = lazy(() => import('./components/SetupWizard').then((m) => ({ default: m.SetupWizard })));
const InterviewSimulation = lazy(() =>
  import('./components/InterviewSimulation').then((m) => ({ default: m.InterviewSimulation }))
);
const ResultsScreen = lazy(() => import('./components/ResultsScreen').then((m) => ({ default: m.ResultsScreen })));
const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })));
const UpgradeModal = lazy(() => import('./components/UpgradeModal').then((m) => ({ default: m.UpgradeModal })));
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
import { InterviewConfig, InterviewResult, AppView, UserPlan, PLAN_LIMITS } from './types';
import { persistenceService } from './services/persistenceService';
import { planService } from './services/planService';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useTheme } from './hooks/useTheme';
import { sessionRecovery } from './services/sessionRecovery';

// Hash-based routing: maps AppView to URL hashes for SEO & shareability
const VIEW_TO_HASH: Partial<Record<AppView, string>> = {
  [AppView.HOME]: '',
  [AppView.TERMS]: 'terms',
  [AppView.PRIVACY]: 'privacy',
  [AppView.SETUP]: 'setup',
  [AppView.DASHBOARD]: 'dashboard',
  [AppView.SETTINGS]: 'settings',
};

const HASH_TO_VIEW: Record<string, AppView> = Object.entries(VIEW_TO_HASH).reduce(
  (acc, [view, hash]) => {
    if (hash) acc[hash] = view as AppView;
    return acc;
  },
  {} as Record<string, AppView>
);

function getInitialView(): AppView {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return HASH_TO_VIEW[hash] || AppView.HOME;
}

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentViewState] = useState<AppView>(getInitialView);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeConfig, setActiveConfig] = useState<InterviewConfig | null>(null);
  const [lastResult, setLastResult] = useState<InterviewResult | null>(null);
  const [history, setHistory] = useState<InterviewResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [userPlan, setUserPlan] = useState<UserPlan>('starter');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Sync URL hash with view state
  const setCurrentView = (view: AppView) => {
    setCurrentViewState(view);
    const hash = VIEW_TO_HASH[view];
    if (hash !== undefined) {
      window.location.hash = hash ? `#/${hash}` : '';
      if (!hash) window.history.pushState(null, '', window.location.pathname);
    }
  };

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const view = HASH_TO_VIEW[hash] || AppView.HOME;
      setCurrentViewState(view);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dev helper: switch plans from browser console — e.g. setPlan('professional')
  useEffect(() => {
    (window as any).setPlan = async (plan: UserPlan) => {
      setUserPlan(plan);
      console.log(`Plan switched to: ${plan}`);
      try {
        await planService.setUserPlan(plan);
        console.log('Plan saved to Firestore');
      } catch (e) {
        console.warn('Could not save to Firestore (offline?), plan is active locally for this session');
      }
    };
    return () => { delete (window as any).setPlan; };
  }, []);

  useEffect(() => {
    let unsubPlan: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
        if (currentUser) {
          persistenceService.getHistory().then(setHistory).catch(console.error);
          // Initial plan fetch as fallback
          planService.getUserPlan().then(setUserPlan).catch(console.error);
          // Real-time listener: auto-updates plan when webhook writes to Firestore
          const planRef = doc(db, 'users', currentUser.uid, 'profile', 'plan');
          unsubPlan = onSnapshot(planRef, (snap) => {
            if (snap.exists()) {
              const plan = snap.data().plan as UserPlan;
              if (plan === 'professional' || plan === 'premium' || plan === 'starter') {
                setUserPlan(plan);
              }
            }
          }, (err) => console.warn('Plan listener error:', err));
        } else {
          // User signed out — clean up plan listener
          if (unsubPlan) { unsubPlan(); unsubPlan = null; }
          setUserPlan('starter');
        }
      },
      (err) => {
        console.error('Auth initialization error:', err);
        setAuthLoading(false);
        setError('Secure session could not be established.');
      }
    );
    return () => {
      unsubscribe();
      if (unsubPlan) unsubPlan();
    };
  }, []);

  // Check for recoverable session on mount
  useEffect(() => {
    if (sessionRecovery.exists()) {
      setRecoveryAvailable(true);
    }
  }, []);

  const handleResumeSession = () => {
    const recovered = sessionRecovery.load();
    if (recovered) {
      setActiveConfig(recovered.config);
      setCurrentView(AppView.SIMULATION);
    }
    setRecoveryAvailable(false);
  };

  const handleDismissRecovery = () => {
    sessionRecovery.clear();
    setRecoveryAvailable(false);
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFinishInterview = (result: InterviewResult) => {
    setLastResult(result);
    setHistory((prev) => [result, ...prev]); // Update history immediately for instant Dashboard display
    setCurrentView(AppView.RESULTS);
    persistenceService.saveInterview(result)
      .catch((e) => console.error('Failed to save session:', e));
  };

  const handleStartInterviewFlow = (cfg: InterviewConfig) => {
    const limits = PLAN_LIMITS[userPlan];

    // Check session count (null = unlimited, skip check)
    if (limits.sessionLimit !== null) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const sessionCount = history.filter((item) => new Date(item.date) >= startOfMonth).length;
      if (sessionCount >= limits.sessionLimit) {
        setShowUpgradeModal(true);
        return;
      }
    }

    // Check audio minutes cap
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const audioUsedMinutes = history
      .filter((item) => new Date(item.date) >= startOfMonth)
      .reduce((sum, item) => sum + (item.duration ?? 0), 0) / 60;
    if (audioUsedMinutes >= limits.maxAudioMinutesPerMonth) {
      setShowUpgradeModal(true);
      return;
    }

    setActiveConfig(cfg);
    setCurrentView(AppView.SIMULATION);
  };

  const handleLoginClick = () => {
    if (user) {
      setCurrentView(AppView.DASHBOARD);
    } else {
      setCurrentView(AppView.SETUP);
    }
  };

  const handleClearHistory = async () => {
    await persistenceService.clearHistory();
    setHistory([]);
  };

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading MockMentor...</p>
        </div>
      );
    }

    if (!user && currentView !== AppView.HOME && currentView !== AppView.TERMS && currentView !== AppView.PRIVACY) {
      return <Login />;
    }

    switch (currentView) {
      case AppView.HOME:
        return <Home onStart={() => setCurrentView(AppView.SETUP)} onGoDashboard={() => setCurrentView(AppView.DASHBOARD)} onGoTerms={() => setCurrentView(AppView.TERMS)} onGoPrivacy={() => setCurrentView(AppView.PRIVACY)} />;
      case AppView.TERMS:
        return <TermsOfService onGoHome={() => setCurrentView(AppView.HOME)} />;
      case AppView.PRIVACY:
        return <PrivacyPolicy onGoHome={() => setCurrentView(AppView.HOME)} />;
      case AppView.SETUP:
        return <SetupWizard onStart={handleStartInterviewFlow} maxQuestions={PLAN_LIMITS[userPlan].maxQuestionsPerSession} userPlan={userPlan} />;
      case AppView.SIMULATION:
        return activeConfig ? (
          <InterviewSimulation config={activeConfig} onFinish={handleFinishInterview} onError={setError} questionTimeLimitCap={PLAN_LIMITS[userPlan].questionTimeLimitCap} />
        ) : (
          <SetupWizard onStart={handleStartInterviewFlow} maxQuestions={PLAN_LIMITS[userPlan].maxQuestionsPerSession} userPlan={userPlan} />
        );
      case AppView.RESULTS:
        return lastResult ? (
          <ResultsScreen result={lastResult} onDone={() => setCurrentView(AppView.DASHBOARD)} />
        ) : (
          <Dashboard history={history} onStartNew={() => setCurrentView(AppView.SETUP)} />
        );
      case AppView.DASHBOARD:
        return <Dashboard history={history} onStartNew={() => setCurrentView(AppView.SETUP)} />;
      case AppView.SETTINGS:
        return user ? (
          <Settings user={user} userPlan={userPlan} theme={theme} onToggleTheme={toggleTheme} onSignOut={() => signOut(auth)} history={history} onClearHistory={handleClearHistory} />
        ) : (
          <Login />
        );
      default:
        return <Home onStart={() => setCurrentView(AppView.SETUP)} onGoDashboard={() => setCurrentView(AppView.DASHBOARD)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 dark:text-slate-100">
      <Header
        onGoHome={() => setCurrentView(AppView.HOME)}
        onGoDashboard={() => setCurrentView(AppView.DASHBOARD)}
        onGoSettings={() => setCurrentView(AppView.SETTINGS)}
        onLogin={handleLoginClick}
        theme={theme}
        onToggleTheme={toggleTheme}
        userPlan={userPlan}
      />

      <main className="relative z-10 min-h-[calc(100vh-80px)]">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading...</p>
            </div>
          }
        >
          {renderContent()}
        </Suspense>
      </main>

      {recoveryAvailable && currentView === AppView.HOME && (
        <div className="fixed bottom-24 right-8 z-[100] animate-slide-up" role="status">
          <div className="bg-blue-600 text-white px-8 py-5 rounded-[24px] shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <div>
              <p className="font-black text-sm">Session Recovery Available</p>
              <p className="text-white/70 text-xs font-bold">You have an unfinished interview session.</p>
            </div>
            <button
              onClick={handleResumeSession}
              className="px-5 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-colors"
            >
              Resume
            </button>
            <button
              onClick={handleDismissRecovery}
              aria-label="Dismiss recovery"
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-8 right-8 z-[100] animate-slide-up" role="alert" aria-live="assertive">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-5 rounded-[24px] shadow-2xl border border-white/10 dark:border-slate-200 flex items-center gap-4 backdrop-blur-xl">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center" aria-hidden="true">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-wider opacity-60">System Alert</p>
              <p className="font-bold">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="ml-4 w-8 h-8 rounded-full hover:bg-white/10 dark:hover:bg-slate-900/10 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showUpgradeModal && (
        <Suspense fallback={null}>
          <UpgradeModal
            userPlan={userPlan}
            onClose={() => setShowUpgradeModal(false)}
          />
        </Suspense>
      )}

      {/* Background Decor */}
      <div className="fixed top-0 left-0 -z-0 w-full h-full overflow-hidden opacity-40 dark:opacity-20 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-100/60 dark:bg-blue-900/40 rounded-full blur-[160px]" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-100/60 dark:bg-indigo-900/40 rounded-full blur-[140px]" />
      </div>
    </div>
  );
};

export default App;
