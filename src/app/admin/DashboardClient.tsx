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
  remindersCount: number;
  quotesCount: number;
}

export default function DashboardClient({ customersCount, remindersCount }: Props) {
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

      </div>
    </div>
  );
}
