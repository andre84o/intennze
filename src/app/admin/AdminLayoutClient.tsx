"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminProvider, useAdmin } from "./AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

/**
 * The page's own background color, so the (transparent) header reveals it all
 * the way to the top instead of the default gray. Keep in sync with each page
 * root's background: /admin/sales → #f6f5fb, /admin/crm → slate-50, else gray-50.
 */
function pageBackground(pathname: string): string {
  if (pathname.startsWith("/admin/sales")) return "#f6f5fb";
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
    <div className="min-h-screen" style={{ backgroundColor: pageBackground(pathname ?? "") }}>
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
