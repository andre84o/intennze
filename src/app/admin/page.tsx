import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Admin | intenzze",
};

interface PageView {
  created_at: string;
  visitor_id: string;
  device_type: string | null;
  source: string | null;
}

export default async function AdminPage() {
  const supabase = await createClient();

  // Get the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const today = new Date().toISOString().split("T")[0];

  // Fetch page views for the last 30 days
  const { data: pageViews } = await supabase
    .from("page_views")
    .select("created_at, visitor_id, device_type, source")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: true });

  // Fetch counts for other stats
  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: remindersCount } = await supabase
    .from("reminders")
    .select("*", { count: "exact", head: true })
    .eq("is_completed", false);

  const { count: quotesCount } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .in("status", ["draft", "sent"]);

  // Process page views data
  const views: PageView[] = pageViews || [];

  // Daily visitors by device type (unique visitors per day per device)
  const dailyMobileVisitors = new Map<string, Set<string>>();
  const dailyDesktopVisitors = new Map<string, Set<string>>();

  views.forEach((view) => {
    const date = view.created_at.split("T")[0];
    const deviceType = view.device_type || "desktop";

    if (!dailyMobileVisitors.has(date)) {
      dailyMobileVisitors.set(date, new Set());
      dailyDesktopVisitors.set(date, new Set());
    }

    if (deviceType === "mobile" || deviceType === "tablet") {
      dailyMobileVisitors.get(date)!.add(view.visitor_id);
    } else {
      dailyDesktopVisitors.get(date)!.add(view.visitor_id);
    }
  });

  // Generate all dates in range
  const dailyVisitors = [];
  const currentDate = new Date(thirtyDaysAgo);
  while (currentDate <= new Date()) {
    const dateStr = currentDate.toISOString().split("T")[0];
    dailyVisitors.push({
      date: new Date(dateStr).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }),
      mobile: dailyMobileVisitors.get(dateStr)?.size || 0,
      desktop: dailyDesktopVisitors.get(dateStr)?.size || 0,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Device stats
  const deviceMap = new Map<string, number>();
  views.forEach((view) => {
    const device = view.device_type || "desktop";
    deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
  });
  const deviceStats = Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value }));

  // Source stats
  const sourceMap = new Map<string, number>();
  views.forEach((view) => {
    const source = view.source || "direct";
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });
  const sourceStats = Array.from(sourceMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Totals
  const allVisitors = new Set(views.map((v) => v.visitor_id));
  const todayViews = views.filter((v) => v.created_at.startsWith(today));
  const todayVisitors = new Set(todayViews.map((v) => v.visitor_id));

  const analytics = {
    dailyVisitors,
    deviceStats,
    sourceStats,
    totals: {
      totalVisitors: allVisitors.size,
      totalPageViews: views.length,
      todayVisitors: todayVisitors.size,
      todayPageViews: todayViews.length,
    },
  };

  return (
    <DashboardClient
      analytics={analytics}
      customersCount={customersCount || 0}
      remindersCount={remindersCount || 0}
      quotesCount={quotesCount || 0}
    />
  );
}
