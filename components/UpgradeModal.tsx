import React, { useState } from 'react';
import { UserPlan, PLAN_LIMITS } from '../types';
import { openCheckout, type BillingInterval } from '../services/lemonSqueezyService';
import { useLemonSqueezy } from '../hooks/useLemonSqueezy';

interface UpgradeModalProps {
  userPlan: UserPlan;
  onClose: () => void;
}

interface PlanCardProps {
  plan: UserPlan;
  price: string;
  priceSuffix?: string;
  features: string[];
  isCurrent: boolean;
  onUpgrade: (plan: 'professional' | 'premium') => void;
  activating: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, price, priceSuffix, features, isCurrent, onUpgrade, activating }) => {
  const label = PLAN_LIMITS[plan].label;
  const isHighlighted = plan === 'premium';
  const isPaid = plan === 'professional' || plan === 'premium';

  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col gap-4 border-2 transition-all ${
        isHighlighted
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
          : isCurrent
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      }`}
    >
      {isHighlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          Best Value
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          Current Plan
        </span>
      )}

      <div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">{label}</h3>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
          {price}
          {price !== 'Free' && <span className="text-sm font-bold text-slate-400">{priceSuffix || '/mo'}</span>}
        </p>
      </div>

      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => isPaid && !isCurrent && onUpgrade(plan as 'professional' | 'premium')}
        disabled={isCurrent || !isPaid || activating}
        className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
          isCurrent
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            : isPaid
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
        }`}
      >
        {isCurrent ? 'Current Plan' : !isPaid ? 'Current Tier' : activating ? 'Activating...' : `Upgrade to ${label}`}
      </button>
    </div>
  );
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ userPlan, onClose }) => {
  const limits = PLAN_LIMITS[userPlan];
  const sessionLabel = limits.isLifetimeLimit ? 'lifetime' : 'monthly';
  const [activating, setActivating] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  useLemonSqueezy(() => {
    // Checkout.Success fires in the overlay — plan will be activated by webhook
    setActivating(true);
  });

  const handleUpgrade = (plan: 'professional' | 'premium') => {
    openCheckout(plan, billingInterval);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {activating ? 'Payment Received!' : 'Session Limit Reached'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {activating
                  ? 'Your plan is being activated. This may take a few seconds...'
                  : <>You've used all {limits.sessionLimit} {sessionLabel} sessions on the{' '}
                    <span className="font-bold text-slate-700 dark:text-slate-300">{limits.label}</span> plan.</>
                }
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="px-8 pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingInterval === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${billingInterval === 'yearly' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${billingInterval === 'yearly' ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-xs font-bold ${billingInterval === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Yearly</span>
          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-black rounded-full">Save 20%</span>
        </div>

        {/* Plan Cards */}
        <div className="px-8 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PlanCard
            plan="starter"
            price="Free"
            features={['3 lifetime sessions', '1 question per session', 'Basic feedback']}
            isCurrent={userPlan === 'starter'}
            onUpgrade={handleUpgrade}
            activating={activating}
          />
          <PlanCard
            plan="professional"
            price={billingInterval === 'monthly' ? '$19' : '$182'}
            priceSuffix={billingInterval === 'monthly' ? '/mo' : '/yr'}
            features={['8 sessions/month', 'Up to 3 questions', 'Detailed AI feedback', 'Dashboard history']}
            isCurrent={userPlan === 'professional'}
            onUpgrade={handleUpgrade}
            activating={activating}
          />
          <PlanCard
            plan="premium"
            price={billingInterval === 'monthly' ? '$49' : '$470'}
            priceSuffix={billingInterval === 'monthly' ? '/mo' : '/yr'}
            features={['20 sessions/month', 'Up to 5 questions', 'Advanced analytics', 'Priority support']}
            isCurrent={userPlan === 'premium'}
            onUpgrade={handleUpgrade}
            activating={activating}
          />
        </div>

        <div className="px-8 pb-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Secure payment powered by Lemon Squeezy. Cancel anytime.
        </div>
      </div>
    </div>
  );
};
