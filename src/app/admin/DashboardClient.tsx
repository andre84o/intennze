"use client";

interface AnalyticsData {
  dailyVisitors: { date: string; mobile: number; desktop: number }[];
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
  quotesCount: number;
}

export default function DashboardClient(_props: Props) {
  return (
    <div className="text-gray-900">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-5 sm:right-10 w-48 sm:w-72 h-48 sm:h-72 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-5 sm:left-10 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative" />
    </div>
  );
}
