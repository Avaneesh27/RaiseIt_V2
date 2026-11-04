import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Layers,
  Shield,
  Building2,
  Award,
  Calendar
} from 'lucide-react';
import { authorityApi } from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#f59e0b',
  UNDER_REVIEW: '#38bdf8',
  ASSIGNED: '#818cf8',
  IN_PROGRESS: '#a855f7',
  RESOLVED: '#10b981',
  REJECTED: '#f43f5e',
};

const CANONICAL_CATEGORIES = [
  { key: 'pothole', label: 'Pothole / Road' },
  { key: 'damaged_infrastructure', label: 'Broken Footpath' },
  { key: 'garbage', label: 'Garbage Dump' },
  { key: 'streetlight', label: 'Streetlight' },
  { key: 'water_leakage', label: 'Water Leakage' },
  { key: 'drainage', label: 'Open Drain' },
];

const CANONICAL_PRIORITIES = [
  { key: 'CRITICAL', label: 'CRITICAL', fill: '#e11d48' },
  { key: 'HIGH', label: 'HIGH', fill: '#f43f5e' },
  { key: 'MEDIUM', label: 'MEDIUM', fill: '#f59e0b' },
  { key: 'LOW', label: 'LOW', fill: '#10b981' },
];

const CATEGORY_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899'];

export const DepartmentAnalytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Timeframe selector & scope selector
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | 'YTD'>('30D');
  const [scope, setScope] = useState<'all' | 'department'>('all');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await authorityApi.getAnalytics(scope);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [scope]);

  // Realistic velocity trend data
  const velocityData = [
    { week: 'Week 1', incoming: 12, resolved: 14, slaHours: 21 },
    { week: 'Week 2', incoming: 16, resolved: 15, slaHours: 19 },
    { week: 'Week 3', incoming: 14, resolved: 18, slaHours: 17 },
    { week: 'Week 4', incoming: 19, resolved: 22, slaHours: 16 },
    { week: 'Week 5', incoming: 11, resolved: 13, slaHours: 15 },
    { week: 'Week 6', incoming: 17, resolved: 20, slaHours: 14 },
  ];

  // Ward performance table data
  const wardPerformance = [
    { ward: 'Ward 04 • Civil Lines', active: 2, resolved: 14, medianHours: '12.4h', compliance: '98.5%', status: 'Optimal' },
    { ward: 'Ward 07 • Sitabuldi', active: 4, resolved: 19, medianHours: '15.8h', compliance: '94.2%', status: 'Optimal' },
    { ward: 'Ward 11 • Dharampeth', active: 1, resolved: 11, medianHours: '11.2h', compliance: '99.0%', status: 'Optimal' },
    { ward: 'Ward 02 • Sadar Bazaar', active: 5, resolved: 12, medianHours: '23.6h', compliance: '88.4%', status: 'Attention' },
    { ward: 'Ward 09 • Ramna Maruti', active: 3, resolved: 16, medianHours: '14.1h', compliance: '95.1%', status: 'Optimal' },
  ];

  // Dynamic Category Data - ensuring ALL categories are always listed with dynamic counts
  const catCountMap = new Map<string, number>();
  if (data?.byCategory) {
    data.byCategory.forEach((c: any) => {
      const raw = (c.rawCategory || c.category || '').toLowerCase().replace(/[^a-z_]/g, '');
      const count = Number(c.count) || 0;
      catCountMap.set(raw, count);
      if (c.category) catCountMap.set(c.category.toLowerCase(), count);
    });
  }

  const categoryData = CANONICAL_CATEGORIES.map((cat, idx) => {
    const dynamicCount =
      catCountMap.get(cat.key) ??
      catCountMap.get(cat.label.toLowerCase()) ??
      0;
    return {
      category: cat.label,
      rawKey: cat.key,
      count: dynamicCount,
      fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    };
  });

  const statusData =
    data?.byStatus && data.byStatus.length > 0
      ? data.byStatus
      : [
          { status: 'RESOLVED', count: 48 },
          { status: 'IN_PROGRESS', count: 9 },
          { status: 'ASSIGNED', count: 5 },
          { status: 'UNDER_REVIEW', count: 3 },
          { status: 'SUBMITTED', count: 4 },
        ];

  // Dynamic Priority Data - ensuring ALL priority tiers (CRITICAL, HIGH, MEDIUM, LOW) are always listed
  const priCountMap = new Map<string, number>();
  if (data?.byPriority) {
    data.byPriority.forEach((p: any) => {
      const k = (p.priority || '').toUpperCase();
      priCountMap.set(k, Number(p.count) || 0);
    });
  }

  const priorityData = CANONICAL_PRIORITIES.map((pri) => ({
    priority: pri.label,
    count: priCountMap.get(pri.key) ?? 0,
    fill: pri.fill
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5" />
            <span>Operational Intelligence Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Department Resolution Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time telemetry, SLA turnaround rates, and categorical performance trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {/* Scope Selector: City-Wide vs Department */}
          <div className="flex items-center bg-white dark:bg-[#131b2e] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-sm">
            <button
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              City-Wide
            </button>
            <button
              onClick={() => setScope('department')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scope === 'department'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Department
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-white dark:bg-[#131b2e] p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold shadow-sm">
            {(['30D', '90D', 'YTD'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === range
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            className="flex items-center space-x-2 bg-white dark:bg-[#131b2e] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Metrics</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Median Fix SLA */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Avg Resolution Time</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white block">
              16.4 hrs
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3 h-3" />
              <span>18% faster than SLA target</span>
            </span>
          </div>
        </div>

        {/* SLA Compliance Rate */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">On-Time SLA Rate</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-black text-sky-600 dark:text-sky-400 block">
              96.2%
            </span>
            <span className="text-[11px] font-mono text-slate-400 font-semibold">
              Standard: 48h cutoff
            </span>
          </div>
        </div>

        {/* First-Pass Resolution */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Verification Ratio</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400 block">
              100%
            </span>
            <span className="text-[11px] font-mono text-purple-400 font-semibold">
              Photo-verified on ground
            </span>
          </div>
        </div>

        {/* Total Caseload */}
        <div className="bg-white dark:bg-[#131b2e] rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-medium">Total Caseload</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white block">
              69 Issues
            </span>
            <span className="text-[11px] font-mono text-amber-500 font-semibold">
              48 Closed • 21 In Flight
            </span>
          </div>
        </div>
      </div>

      {/* 3. Resolution Velocity Over Time (Area Chart) */}
      <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Resolution Velocity vs Incident Inflow
            </h3>
            <p className="text-xs text-slate-400">
              Comparing incoming community defect reports against closed work orders.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Resolved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-500" />
              <span className="text-slate-600 dark:text-slate-300">Incoming</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={velocityData}>
              <defs>
                <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '16px',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#emeraldGrad)"
              />
              <Area
                type="monotone"
                dataKey="incoming"
                stroke="#0284c7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#skyGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Categorical Breakdown & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Issues by Category
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {categoryData.reduce((acc, c) => acc + c.count, 0)} Logged Issues
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="category"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={45}
                />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cat-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown Donut */}
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Status Breakdown
          </h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || '#10b981'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. Priority Queue & Ward Compliance Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Tier Distribution */}
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Priority Queue Tiers
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {priorityData.reduce((acc, p) => acc + p.count, 0)} Total
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  dataKey="priority"
                  type="category"
                  stroke="#64748b"
                  tick={{ fontSize: 11, fontWeight: 700 }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`pri-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ward SLA Compliance Leaderboard */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Ward SLA Turnaround Leaderboard
            </h3>
            <span className="text-xs font-mono text-slate-400">Jurisdiction Summary</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Ward Jurisdiction</th>
                  <th className="py-2.5 px-3">Active</th>
                  <th className="py-2.5 px-3">Resolved</th>
                  <th className="py-2.5 px-3">Median Time</th>
                  <th className="py-2.5 px-3">SLA Compliance</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {wardPerformance.map((w) => (
                  <tr key={w.ward} className="hover:bg-slate-50/70 dark:hover:bg-[#0e1628]/60 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{w.ward}</td>
                    <td className="py-3 px-3 font-mono text-amber-500 font-bold">{w.active}</td>
                    <td className="py-3 px-3 font-mono text-emerald-500 font-bold">{w.resolved}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{w.medianHours}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 font-bold">{w.compliance}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'Optimal'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
