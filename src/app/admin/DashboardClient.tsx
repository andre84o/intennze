"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  Label,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const SOURCE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

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

const chartConfig = {
  visitors: {
    label: "Besökare",
    color: "var(--chart-1)",
  },
  pageViews: {
    label: "Sidvisningar",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const deviceChartConfig = {
  value: {
    label: "Besökare",
  },
  desktop: {
    label: "Dator",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobil",
    color: "var(--chart-2)",
  },
  tablet: {
    label: "Surfplatta",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export default function DashboardClient({ analytics, customersCount, remindersCount, quotesCount }: Props) {
  const { dailyVisitors, deviceStats, sourceStats, totals } = analytics;
  const [timeRange, setTimeRange] = React.useState("30d");

  const filteredData = React.useMemo(() => {
    if (!dailyVisitors.length) return [];
    const daysToShow = timeRange === "7d" ? 7 : timeRange === "14d" ? 14 : 30;
    return dailyVisitors.slice(-daysToShow);
  }, [dailyVisitors, timeRange]);

  return (
    <div className="text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-5 sm:left-10 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-1">Översikt över din webbplats</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Today's Visitors */}
          <div className="p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-transparent rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] sm:text-xs">Besökare idag</p>
                <p className="text-lg sm:text-xl font-bold">{totals.todayVisitors}</p>
              </div>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl hover:border-purple-500/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-transparent rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] sm:text-xs">Totalt (30 dagar)</p>
                <p className="text-lg sm:text-xl font-bold">{totals.totalVisitors}</p>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl hover:border-green-500/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-transparent rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] sm:text-xs">Kunder</p>
                <p className="text-lg sm:text-xl font-bold">{customersCount}</p>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl hover:border-amber-500/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-transparent rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] sm:text-xs">Påminnelser</p>
                <p className="text-lg sm:text-xl font-bold">{remindersCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Interactive Area Chart */}
          <Card className="lg:col-span-2 bg-slate-900/50 backdrop-blur-xl border-slate-800">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b border-slate-800 py-5 sm:flex-row">
              <div className="grid flex-1 gap-1 text-center sm:text-left">
                <CardTitle className="text-white">Besökare per dag</CardTitle>
                <CardDescription className="text-slate-400">
                  Visar besökare och sidvisningar över tid
                </CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger
                  className="w-[140px] sm:w-[160px] rounded-lg bg-slate-800/50 border-slate-700 text-white"
                  aria-label="Välj tidsperiod"
                >
                  <SelectValue placeholder="Senaste 30 dagarna" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-slate-800 border-slate-700">
                  <SelectItem value="30d" className="rounded-lg text-white focus:bg-slate-700 focus:text-white">
                    Senaste 30 dagarna
                  </SelectItem>
                  <SelectItem value="14d" className="rounded-lg text-white focus:bg-slate-700 focus:text-white">
                    Senaste 14 dagarna
                  </SelectItem>
                  <SelectItem value="7d" className="rounded-lg text-white focus:bg-slate-700 focus:text-white">
                    Senaste 7 dagarna
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
              {filteredData.length > 0 ? (
                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                  <AreaChart data={filteredData}>
                    <defs>
                      <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-visitors)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-visitors)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-pageViews)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-pageViews)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("sv-SE", {
                          month: "short",
                          day: "numeric",
                        });
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      width={40}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => {
                            return new Date(value).toLocaleDateString("sv-SE", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            });
                          }}
                          indicator="dot"
                        />
                      }
                    />
                    <Area
                      dataKey="pageViews"
                      type="natural"
                      fill="url(#fillPageViews)"
                      stroke="var(--color-pageViews)"
                      stackId="a"
                    />
                    <Area
                      dataKey="visitors"
                      type="natural"
                      fill="url(#fillVisitors)"
                      stroke="var(--color-visitors)"
                      stackId="b"
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Ingen data ännu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device type chart - Pie Chart with Custom Label */}
          <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-white">Enhetstyp</CardTitle>
              <CardDescription className="text-slate-400">Fördelning av besökare per enhet</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {deviceStats.length > 0 ? (
                <ChartContainer
                  config={deviceChartConfig}
                  className="mx-auto aspect-square max-h-[250px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={deviceStats.map((d) => ({
                        ...d,
                        fill: `var(--color-${d.name})`,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      strokeWidth={5}
                    >
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            const total = deviceStats.reduce((acc, curr) => acc + curr.value, 0);
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-white text-3xl font-bold"
                                >
                                  {total.toLocaleString()}
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 24}
                                  className="fill-slate-400"
                                >
                                  Besökare
                                </tspan>
                              </text>
                            );
                          }
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Ingen data ännu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Traffic source chart */}
          <div className="p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Trafikkälla</h3>
            <div className="h-48 sm:h-64">
              {sourceStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sourceStats.map((d) => ({ ...d, name: sourceLabels[d.name] || d.name }))}
                    layout="vertical"
                    margin={{ left: -10, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tick={{ fontSize: 10 }} width={60} />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Sidvisningar idag</h3>
            <p className="text-3xl sm:text-4xl font-bold text-cyan-400">{totals.todayPageViews}</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Totalt {totals.totalPageViews} sidvisningar (30 dagar)
            </p>
          </div>

          <div className="p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Offerter</h3>
            <p className="text-3xl sm:text-4xl font-bold text-purple-400">{quotesCount}</p>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">Aktiva offerter</p>
          </div>

          <div className="sm:col-span-2 lg:col-span-1 p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-xl sm:rounded-2xl">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Snabbåtgärder</h3>
            <div className="space-y-2 sm:space-y-3">
              <a
                href="/admin/kunder"
                className="flex items-center gap-2 text-sm sm:text-base text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                Lägg till ny kund
              </a>
              <a
                href="/admin/offerter"
                className="flex items-center gap-2 text-sm sm:text-base text-purple-400 hover:text-purple-300 transition-colors"
              >
                <span className="w-2 h-2 bg-purple-400 rounded-full" />
                Skapa ny offert
              </a>
              <a
                href="/admin/paminnelser"
                className="flex items-center gap-2 text-sm sm:text-base text-amber-400 hover:text-amber-300 transition-colors"
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
