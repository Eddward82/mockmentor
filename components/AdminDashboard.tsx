import React, { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { authHeaders } from '../services/aiApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';

interface DailyAnalytics {
  date: string;
  totalUsers: number;
  activeUsersThisWeek: number;
  planCounts: { starter: number; professional: number; premium: number };
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  avgScore: number;
  churnRisk: number;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyCost: number;
  estimatedProfit: number;
  topJobTitles: { title: string; count: number }[];
  weeklySessionTrend: { week: string; sessions: number }[];
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#94a3b8',
  professional: '#3b82f6',
  premium: '#6366f1',
};

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DailyAnalytics | null>(null);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BASE_URL = (import.meta as any).env?.VITE_FUNCTIONS_BASE_URL || 'https://us-central1-sql-calculation-393000.cloudfunctions.net';

  const loadAnalytics = async () => {
    try {
      const latestSnap = await getDoc(doc(db, 'admin/analytics'));
      if (latestSnap.exists() && latestSnap.data().latest) {
        setStats(latestSnap.data().latest as DailyAnalytics);
      } else {
        setStats(null);
      }
      const historySnap = await getDocs(
        query(collection(db, 'admin/analytics/daily'), orderBy('date', 'desc'), limit(7))
      );
      setHistoryDates(historySnap.docs.map((d) => d.id));
    } catch (e) {
      console.error(e);
      setError('Failed to load analytics.');
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadAnalytics();
      setLoading(false);
    };
    init();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE_URL}/triggerAnalytics`, { method: 'POST', headers });
      if (!res.ok) throw new Error(await res.text());
      await loadAnalytics();
    } catch (e: any) {
      setError(`Refresh failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-600 dark:text-red-400 font-bold">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8">
          <p className="text-lg font-black text-slate-800 dark:text-white mb-2">No analytics yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            The <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">generateDailyAnalytics</code> function
            runs every day at 02:00 UTC. Or generate now:
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {refreshing ? 'Generating...' : 'Generate Now'}
          </button>
          {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  const planChartData = [
    { name: 'Starter',      value: stats.planCounts.starter },
    { name: 'Professional', value: stats.planCounts.professional },
    { name: 'Premium',      value: stats.planCounts.premium },
  ];

  const sessionGrowth = stats.sessionsLastMonth > 0
    ? Math.round(((stats.sessionsThisMonth - stats.sessionsLastMonth) / stats.sessionsLastMonth) * 100)
    : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Last snapshot</p>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{stats.date}</p>
            {historyDates.length > 1 && (
              <p className="text-[10px] text-slate-400">{historyDates.length} daily snapshots stored</p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Now'}
          </button>
          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users',       value: stats.totalUsers },
          { label: 'Active This Week',  value: stats.activeUsersThisWeek },
          { label: 'Sessions (Month)',  value: stats.sessionsThisMonth, sub: sessionGrowth !== null ? `${sessionGrowth >= 0 ? '+' : ''}${sessionGrowth}% vs last month` : undefined },
          { label: 'Avg Score',         value: `${stats.avgScore}%` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            {sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Revenue Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-100 dark:border-green-800 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-green-500 mb-1">Est. Revenue / Mo</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-400">${stats.estimatedMonthlyRevenue}</p>
          <p className="text-[10px] font-bold text-green-400 mt-0.5">Based on plan counts</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-800 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-orange-500 mb-1">Est. API Cost / Mo</p>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-400">${stats.estimatedMonthlyCost}</p>
          <p className="text-[10px] font-bold text-orange-400 mt-0.5">~$0.12 per session</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-800 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Est. Profit / Mo</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-400">${stats.estimatedProfit}</p>
          <p className="text-[10px] font-bold text-blue-400 mt-0.5">Revenue minus API cost</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-800 p-5">
          <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">Churn Risk</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-400">{stats.churnRisk}</p>
          <p className="text-[10px] font-bold text-red-400 mt-0.5">Inactive from last month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Plan Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Plan Distribution</h2>
          <div className="flex gap-4 mb-4">
            {planChartData.map(({ name, value }) => (
              <div key={name} className="flex-1 text-center">
                <p className="text-xl font-black text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs font-bold text-slate-400">{name}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={planChartData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => [v, 'Users']} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {planChartData.map((entry) => (
                  <Cell key={entry.name} fill={PLAN_COLORS[entry.name.toLowerCase()]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Session Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-xs font-black uppercase tracking-widests text-slate-400 mb-4">Sessions This Month (Weekly)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.weeklySessionTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Job Titles */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Top Job Titles (This Month)</h2>
        {stats.topJobTitles.length === 0 ? (
          <p className="text-sm text-slate-400">No sessions this month yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.topJobTitles.map(({ title, count }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.round((count / Math.max(stats.sessionsThisMonth, 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 w-40 truncate">{title}</span>
                <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full flex-shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
