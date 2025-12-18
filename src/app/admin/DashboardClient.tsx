"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface AnalyticsData {
  dailyVisitors: { date: string; visitors: number; pageViews: number }[];
  deviceStats: { name: string; value: number }[];
  sourceStats: { name: string; value: number }[];
  totals: {
    totalVisitors: number;
    totalPageViews: number;
    todayVisitors: number;
    todayPageViews: number;
  };
}

interface Props {
  analytics: AnalyticsData;
  customersCount: number;
  remindersCount: number;
  quotesCount: number;
}

const DEVICE_COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b"];
const SOURCE_COLORS = ["#06b6d4", "#22c55e", "#3b82f6", "#ec4899", "#f59e0b", "#64748b"];

const sourceLabels: Record<string, string> = {
  direct: "Direkt",
  google: "Google",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  other: "Annan",
};

const deviceLabels: Record<string, string> = {
  desktop: "Dator",
  mobile: "Mobil",
  tablet: "Surfplatta",
};

export default function DashboardClient({ analytics, customersCount, remindersCount, quotesCount }: Props) {
  const { dailyVisitors, deviceStats, sourceStats, totals } = analytics;

  return (
    <div className="text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Översikt över din webbplats</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Today's Visitors */}
          <div className="p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-transparent rounded-xl">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Besökare idag</p>
                <p className="text-xl font-bold">{totals.todayVisitors}</p>
              </div>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-transparent rounded-xl">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Totalt (30 dagar)</p>
                <p className="text-xl font-bold">{totals.totalVisitors}</p>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-green-500/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-transparent rounded-xl">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Kunder</p>
                <p className="text-xl font-bold">{customersCount}</p>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-amber-500/50 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent rounded-xl">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Aktiva påminnelser</p>
                <p className="text-xl font-bold">{remindersCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Visitors per day chart */}
          <div className="lg:col-span-2 p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Besökare per dag</h3>
            <div className="h-72">
              {dailyVisitors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyVisitors}>
                    <defs>
                      <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      name="Besökare"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorVisitors)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      name="Sidvisningar"
                      stroke="#8b5cf6"
                      fillOpacity={1}
                      fill="url(#colorPageViews)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Ingen data ännu
                </div>
              )}
            </div>
          </div>

          {/* Device type chart */}
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Enhetstyp</h3>
            <div className="h-64">
              {deviceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceStats.map((d) => ({ ...d, name: deviceLabels[d.name] || d.name }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {deviceStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Ingen data ännu
                </div>
              )}
            </div>
          </div>

          {/* Traffic source chart */}
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Trafikkälla</h3>
            <div className="h-64">
              {sourceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sourceStats.map((d) => ({ ...d, name: sourceLabels[d.name] || d.name }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="value" name="Besökare" radius={[0, 4, 4, 0]}>
                      {sourceStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                  Ingen data ännu
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Sidvisningar idag</h3>
            <p className="text-4xl font-bold text-cyan-400">{totals.todayPageViews}</p>
            <p className="text-slate-400 text-sm mt-2">
              Totalt {totals.totalPageViews} sidvisningar (30 dagar)
            </p>
          </div>

          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Offerter</h3>
            <p className="text-4xl font-bold text-purple-400">{quotesCount}</p>
            <p className="text-slate-400 text-sm mt-2">Aktiva offerter</p>
          </div>

          <div className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
            <h3 className="text-lg font-semibold mb-4">Snabbåtgärder</h3>
            <div className="space-y-2">
              <a
                href="/admin/kunder"
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                Lägg till ny kund
              </a>
              <a
                href="/admin/offerter"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <span className="w-2 h-2 bg-purple-400 rounded-full" />
                Skapa ny offert
              </a>
              <a
                href="/admin/paminnelser"
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span className="w-2 h-2 bg-amber-400 rounded-full" />
                Se påminnelser
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
