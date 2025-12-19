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
    color: "hsl(var(--chart-1))",
  },
  pageViews: {
    label: "Sidvisningar",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const deviceChartConfig = {
  value: {
    label: "Besökare",
  },
  desktop: {
    label: "Dator",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobil",
    color: "hsl(var(--chart-2))",
  },
  tablet: {
    label: "Surfplatta",
    color: "hsl(var(--chart-3))",
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

  const totalDeviceVisitors = React.useMemo(() => {
    return deviceStats.reduce((acc, curr) => acc + curr.value, 0);
  }, [deviceStats]);

  return (
    <div className="text-gray-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-5 sm:left-10 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Page header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">Översikt över din webbplats</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Today's Visitors */}
          <div className="p-3 sm:p-5 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-blue-50 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] sm:text-xs">Besökare idag</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totals.todayVisitors}</p>
              </div>
            </div>
          </div>

          {/* Total Visitors */}
          <div className="p-3 sm:p-5 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-purple-50 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] sm:text-xs">Totalt (30 dagar)</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{totals.totalVisitors}</p>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="p-3 sm:p-5 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-green-50 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] sm:text-xs">Kunder</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{customersCount}</p>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="p-3 sm:p-5 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-amber-50 rounded-lg sm:rounded-xl">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <p className="text-gray-500 text-[10px] sm:text-xs">Påminnelser</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900">{remindersCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Interactive Area Chart */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader className="flex items-center gap-2 space-y-0 border-b border-gray-100 py-5 sm:flex-row">
              <div className="grid flex-1 gap-1 text-center sm:text-left">
                <CardTitle className="text-gray-900">Besökare per dag</CardTitle>
                <CardDescription className="text-gray-500">
                  Visar besökare och sidvisningar över tid
                </CardDescription>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger
                  className="w-[140px] sm:w-[160px] rounded-lg bg-gray-50 border-gray-200 text-gray-900"
                  aria-label="Välj tidsperiod"
                >
                  <SelectValue placeholder="Senaste 30 dagarna" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-white border-gray-200">
                  <SelectItem value="30d" className="rounded-lg text-gray-900 focus:bg-gray-100 focus:text-gray-900">
                    Senaste 30 dagarna
                  </SelectItem>
                  <SelectItem value="14d" className="rounded-lg text-gray-900 focus:bg-gray-100 focus:text-gray-900">
                    Senaste 14 dagarna
                  </SelectItem>
                  <SelectItem value="7d" className="rounded-lg text-gray-900 focus:bg-gray-100 focus:text-gray-900">
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
                    <CartesianGrid vertical={false} stroke="#e2e8f0" />
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
                <div className="h-[250px] flex items-center justify-center text-gray-400">
                  Ingen data ännu
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Stats - Pie Chart */}
          <Card className="flex flex-col bg-white border-gray-200 shadow-sm">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-gray-900">Enheter</CardTitle>
              <CardDescription className="text-gray-500">Besökare per enhet</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
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
                    data={deviceStats}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {deviceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
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
                                className="fill-gray-900 text-3xl font-bold"
                              >
                                {totalDeviceVisitors.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-gray-500 text-xs"
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
            </CardContent>
            <div className="flex-col gap-2 text-sm p-6 pt-0">
              <div className="flex items-center justify-center gap-2 font-medium leading-none text-gray-900">
                Mest populär: {deviceStats.length > 0 ? deviceLabels[deviceStats[0].name] || deviceStats[0].name : "-"}
              </div>
              <div className="leading-none text-gray-500 text-center mt-1">
                Baserat på de senaste 30 dagarna
              </div>
            </div>
          </Card>

          {/* Source Stats - Bar Chart */}
          <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Trafikkällor</CardTitle>
              <CardDescription className="text-gray-500">Var dina besökare kommer ifrån</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="aspect-auto h-[250px] w-full">
                <BarChart
                  accessibilityLayer
                  data={sourceStats}
                  layout="vertical"
                  margin={{
                    left: 0,
                  }}
                >
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => sourceLabels[value] || value}
                    width={100}
                  />
                  <XAxis dataKey="value" type="number" hide />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="value" layout="vertical" radius={5}>
                    {sourceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
