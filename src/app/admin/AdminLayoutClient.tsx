"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "./AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

/**
 * The page's own background, painted on the outer container so the (transparent)
 * header reveals it all the way to the top instead of the default gray. Keep in
 * sync with each page root's background: /admin dashboard → soft lavender mesh
 * gradient (the dashboard div itself is transparent so this single layer shows
 * through, seamless behind the header — the embedded Sales section rides on this
 * same mesh), /admin/crm → slate-50, else gray-50.
 */
const DASHBOARD_MESH =
  "radial-gradient(at 82% -8%, #F1E8FF 0px, transparent 55%)," +
  "radial-gradient(at 8% 6%, #E7ECFC 0px, transparent 50%)," +
  "radial-gradient(at 12% 92%, #E8F5F6 0px, transparent 48%)," +
  "radial-gradient(at 96% 88%, #FBEDF6 0px, transparent 50%)," +
  "#F1EFF8";

function pageBackground(pathname: string): string {
  if (pathname === "/admin") return DASHBOARD_MESH;
  if (pathname.startsWith("/admin/crm")) return "#f8fafc"; // slate-50
  return "#f9fafb"; // gray-50
}

function AdminContent({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail?: string;
}) {
  const { sidebarState } = useAdmin();
  const pathname = usePathname();

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";

  return (
    <div className="min-h-screen" style={{ background: pageBackground(pathname ?? "") }}>
      <AdminSidebar />
      <AdminHeader userEmail={userEmail} />

      {/* Main content */}
      <main
        className={`pt-14 sm:pt-16 min-h-screen transition-all duration-300 ease-in-out ${
          isOpen ? "ml-52 sm:ml-64" : isCollapsed ? "ml-14 sm:ml-20" : "ml-0"
        }`}
      >
        <div className="p-3 sm:p-6">{children}</div>
      </main>

    </div>
  );
}

export default function AdminLayoutClient({
  children,
  userEmail,
  userName,
  role,
  commissionEligible,
}: {
  children: ReactNode;
  userEmail?: string;
  userName?: string;
  role: "admin" | "staff";
  commissionEligible: boolean;
}) {
  return (
    <AdminProvider
      role={role}
      commissionEligible={commissionEligible}
      userEmail={userEmail ?? ""}
      userName={userName ?? ""}
    >
      <AdminContent userEmail={userEmail}>{children}</AdminContent>
    </AdminProvider>
  );
}
