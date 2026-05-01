import React, { useState } from 'react';
import { PLAN_LIMITS } from '../types';
import { openCheckout, type BillingInterval } from '../services/polarService';

interface HomeProps {
  onStart: () => void;
  onGoDashboard?: () => void;
  onGoTerms?: () => void;
  onGoPrivacy?: () => void;
}

export const Home: React.FC<HomeProps> = ({ onStart, onGoDashboard, onGoTerms, onGoPrivacy }) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  return (
    <div className="relative overflow-hidden">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-16 md:pt-24 pb-24 text-center">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-semibold mb-8 animate-fade-in shadow-sm border border-blue-100 dark:border-blue-800">
          <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
          Enterprise-Grade Interview Intelligence
        </div>

        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-slate-900 dark:text-white tracking-tighter mb-8 leading-[0.9]">
          Elevate Your <br />
          <span className="text-gradient">Career Path</span>
        </h1>

        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
          MockMentor uses Gemini Live API to provide high-fidelity, multimodal interview coaching. Master your narrative
          with real-time feedback on every gesture and word.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-12 py-5 bg-blue-600 text-white rounded-2xl font-black text-xl hover:bg-blue-700 transform transition-all hover:scale-105 shadow-2xl shadow-blue-200 dark:shadow-blue-900/30 active:scale-95"
          >
            Start Practice Session
          </button>
          <button
            onClick={onGoDashboard}
            className="w-full sm:w-auto px-12 py-5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95"
          >
            Explore Dashboard
          </button>
        </div>

        {/* Trust Section */}
        <div className="mb-32">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-10">
            Trusted by candidates from world-class teams
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
            {['Google', 'Amazon', 'Meta', 'Netflix', 'OpenAI'].map((company) => (
              <span key={company} className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
                {company}
              </span>
            ))}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32 text-left">
          <div className="group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-blue-100/30 dark:hover:shadow-blue-900/20 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform shadow-inner">
              <svg
                className="w-8 h-8 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Vision Coaching</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
              Real-time analysis of presence, posture, and eye contact to ensure you project confidence on camera.
            </p>
          </div>
          <div className="group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform shadow-inner">
              <svg
                className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Voice Mastery</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
              Our low-latency audio engine detects filler words, pace, and tonal variations to refine your clarity.
            </p>
          </div>
          <div className="group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-sky-100/30 dark:hover:shadow-sky-900/20 transition-all duration-500 hover:-translate-y-2">
            <div className="w-16 h-16 bg-sky-50 dark:bg-sky-950 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform shadow-inner">
              <svg
                className="w-8 h-8 text-sky-600 dark:text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
              Semantic Analysis
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
              Deep technical audit of your answers to ensure your depth matches the role requirements.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-32">
          <div className="mb-16 text-center">
            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.3em] mb-4">
              How It Works
            </p>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">
              Three Steps to Interview Mastery
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">
              Get started in minutes. No complex setup required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Step 1 */}
            <div className="relative group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-blue-100/30 dark:hover:shadow-blue-900/20 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 text-white text-2xl font-black shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                1
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Set Up Your Session
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
                Choose your target role, experience level, and company. Pick how many questions you want to practice.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8 text-white text-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                2
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Practice Live
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
                Answer AI-generated interview questions on camera. Our system analyzes your voice, body language, and responses in real time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative group p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-sky-100/30 dark:hover:shadow-sky-900/20 transition-all duration-500 hover:-translate-y-2">
              <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mb-8 text-white text-2xl font-black shadow-lg shadow-sky-200 dark:shadow-sky-900/30">
                3
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                Get Your Results
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed text-sm">
                Receive detailed scores on communication, confidence, and technical accuracy — plus actionable suggestions to improve.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-32">
          <div className="mb-16">
            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.3em] mb-4">
              Pricing
            </p>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium mb-8">
              Start free and upgrade as you grow. No hidden fees.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-bold ${billingInterval === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Monthly</span>
              <button
                onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-14 h-7 rounded-full transition-colors ${billingInterval === 'yearly' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${billingInterval === 'yearly' ? 'translate-x-7' : ''}`} />
              </button>
              <span className={`text-sm font-bold ${billingInterval === 'yearly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Yearly</span>
              <span className="ml-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-black rounded-full">Save 20%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {/* Starter Plan */}
            <div className="group relative p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-blue-100/30 dark:hover:shadow-blue-900/20 transition-all duration-500 hover:-translate-y-2">
              <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Starter</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white">$0</span>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-8">Free forever</p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.starter.sessionLimit} sessions per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.starter.maxQuestionsPerSession} question per session</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.starter.questionTimeLimitCap}s per answer</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Basic AI feedback</span>
                </li>
              </ul>

              <button
                onClick={onStart}
                className="w-full py-4 rounded-2xl font-black text-base bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95"
              >
                Get Started
              </button>
            </div>

            {/* Professional Plan */}
            <div className="group relative p-10 bg-white dark:bg-slate-800 rounded-[40px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-blue-100/30 dark:hover:shadow-blue-900/20 transition-all duration-500 hover:-translate-y-2">
              <p className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Professional</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white">{billingInterval === 'monthly' ? '$19' : '$182'}</span>
                <span className="text-lg font-bold text-slate-400">{billingInterval === 'monthly' ? '/mo' : '/yr'}</span>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-8">{billingInterval === 'monthly' ? 'For serious candidates' : '$15.17/mo — Save $46/yr'}</p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.professional.sessionLimit} sessions per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Up to {PLAN_LIMITS.professional.maxQuestionsPerSession} questions per session</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.professional.questionTimeLimitCap}s per answer</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Detailed AI feedback</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Dashboard history & analytics</span>
                </li>
              </ul>

              <button
                onClick={() => openCheckout('professional', billingInterval)}
                className="w-full py-4 rounded-2xl font-black text-base bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                Get Professional
              </button>
            </div>

            {/* Premium Plan */}
            <div className="group relative p-10 bg-white dark:bg-slate-800 rounded-[40px] border-2 border-indigo-500 dark:border-indigo-400 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/30 dark:hover:shadow-indigo-900/20 transition-all duration-500 hover:-translate-y-2">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-full">
                Best Value
              </span>
              <p className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">Premium</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-black text-slate-900 dark:text-white">{billingInterval === 'monthly' ? '$49' : '$470'}</span>
                <span className="text-lg font-bold text-slate-400">{billingInterval === 'monthly' ? '/mo' : '/yr'}</span>
              </div>
              <p className="text-sm font-bold text-slate-400 mb-8">{billingInterval === 'monthly' ? 'For power users' : '$39.17/mo — Save $118/yr'}</p>

              <ul className="space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.premium.sessionLimit} sessions per month</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Up to {PLAN_LIMITS.premium.maxQuestionsPerSession} questions per session</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{PLAN_LIMITS.premium.questionTimeLimitCap}s per answer</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Advanced analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Priority support</span>
                </li>
              </ul>

              <button
                onClick={() => openCheckout('premium', billingInterval)}
                className="w-full py-4 rounded-2xl font-black text-base bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
              >
                Get Premium
              </button>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-400 mt-8">
            Start with Starter to experience MockMentor today.
          </p>
        </div>

        {/* Final CTA */}
        <div className="mb-16 p-12 md:p-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] text-center shadow-2xl shadow-blue-200/40 dark:shadow-blue-900/30">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-lg text-blue-100 max-w-xl mx-auto font-medium mb-10">
            Join thousands of candidates who landed their dream jobs with MockMentor. Start your free practice session today.
          </p>
          <button
            onClick={onStart}
            className="px-12 py-5 bg-white text-blue-700 rounded-2xl font-black text-xl hover:bg-blue-50 transform transition-all hover:scale-105 shadow-2xl shadow-blue-900/30 active:scale-95"
          >
            Start Free Practice
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-20 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="MockMentor" className="w-10 h-10 object-contain rounded-lg bg-white" />
                <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">MockMentor</span>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                AI-powered interview coaching to help you land your dream job.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><button onClick={onStart} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Practice Session</button></li>
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Dashboard</span></li>
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Pricing</span></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-3">
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Interview Tips</span></li>
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Career Blog</span></li>
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">FAQ</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#/privacy" onClick={(e) => { e.preventDefault(); onGoPrivacy?.(); }} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer">Privacy Policy</a></li>
                <li><a href="#/terms" onClick={(e) => { e.preventDefault(); onGoTerms?.(); }} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer">Terms of Service</a></li>
                <li><span className="text-sm font-medium text-slate-500 dark:text-slate-400">Contact</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-400">
              &copy; {new Date().getFullYear()} MockMentor. All rights reserved.
            </p>
            <p className="text-xs font-bold text-slate-400">
              Powered by Google Gemini
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
