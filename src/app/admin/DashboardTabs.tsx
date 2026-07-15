"use client";

import { useState } from "react";
import DashboardClient from "./DashboardClient";
import SalesClient, { MyCommission } from "./sales/SalesClient";

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

type Tab = "dashboard" | "sales";

/**
 * Segmented control shown at the top-centre of the Dashboard. Admin-only — it
 * switches between the regular dashboard and the company sales overview, both of
 * which now live on the /admin page.
 */
function SectionToggle({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "sales", label: "Sales" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-[#EFEDF6] backdrop-blur">
      {items.map(({ key, label }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            style={
              active
                ? {
                    background: "linear-gradient(135deg,#6E5CF3,#8b7bff)",
                    color: "#fff",
                    boxShadow: "0 6px 14px -8px rgba(109,94,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }
                : undefined
            }
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors sm:px-6 sm:py-2 sm:text-[13.5px] ${
              active ? "" : "text-[#67637E] hover:text-[#211D33]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Dashboard shell. Admins get a section toggle (Dashboard / Sales) at the top;
 * the Sales section embeds the full company commission overview. Staff never see
 * the toggle or the sales section — they keep the regular dashboard with their
 * own individual figures (MyCommission). `isAdmin` is resolved server-side; the
 * sales server actions independently re-verify admin, so this is presentation
 * only.
 */
export default function DashboardTabs({
  isAdmin,
  commissionEligible,
  commissionMonth,
  analytics,
  customersCount,
  quotesCount,
}: {
  isAdmin: boolean;
  commissionEligible: boolean;
  commissionMonth: string;
  analytics: AnalyticsData;
  customersCount: number;
  quotesCount: number;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  // Non-admins can never reach the sales section, even if state were forced.
  const activeTab: Tab = isAdmin ? tab : "dashboard";

  return (
    <div className="-m-3 min-h-[calc(100vh-3.5rem)] px-4 pb-10 pt-6 sm:-m-6 sm:min-h-[calc(100vh-4rem)] sm:px-6 lg:px-8">
      {isAdmin && (
        <div className="mb-4 flex justify-center sm:mb-6">
          <SectionToggle tab={activeTab} onChange={setTab} />
        </div>
      )}

      {activeTab === "dashboard" ? (
        <>
          {commissionEligible && (
            <div className="mx-auto max-w-[1180px]">
              <MyCommission initialMonth={commissionMonth} />
            </div>
          )}
          <DashboardClient
            analytics={analytics}
            customersCount={customersCount}
            quotesCount={quotesCount}
          />
        </>
      ) : (
        <SalesClient isAdmin initialMonth={commissionMonth} embedded />
      )}
    </div>
  );
}
