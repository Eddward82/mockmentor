import React, { useState } from 'react';
import { sendEmailVerification, reload, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import type { User } from 'firebase/auth';

interface Props {
  user: User;
  onVerified: () => void;
}

export const EmailVerificationScreen: React.FC<Props> = ({ user, onVerified }) => {
  const [resendLoading, setResendLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setResendLoading(true);
    setMessage(null);
    setError(null);
    try {
      await sendEmailVerification(user);
      setMessage('Verification email sent! Check your inbox (and spam folder).');
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a minute before trying again.');
      } else {
        setError('Failed to send email. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckLoading(true);
    setMessage(null);
    setError(null);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        onVerified();
      } else {
        setError("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch {
      setError('Could not check verification status. Please try again.');
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex items-center justify-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-[48px] p-8 md:p-12 shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-500 text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Verify Your Email</h2>
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm mb-2">
          We sent a verification link to:
        </p>
        <p className="text-blue-600 dark:text-blue-400 font-black text-sm mb-6 break-all">
          {user.email}
        </p>
        <p className="text-slate-400 text-xs font-bold mb-8">
          Click the link in that email, then come back here and press "I've Verified My Email".
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-100 dark:border-red-800">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-2xl border border-green-100 dark:border-green-800">
            {message}
          </div>
        )}

        <button
          onClick={handleCheckVerification}
          disabled={checkLoading}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-[0.98] shadow-xl shadow-blue-100 disabled:opacity-50 mb-3"
        >
          {checkLoading ? 'Checking...' : "I've Verified My Email"}
        </button>

        <button
          onClick={handleResend}
          disabled={resendLoading}
          className="w-full py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-[0.98] disabled:opacity-50 mb-6"
        >
          {resendLoading ? 'Sending...' : 'Resend Verification Email'}
        </button>

        <button
          onClick={() => signOut(auth)}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
};
