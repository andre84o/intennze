"use client";

import { ReactNode } from "react";
import { AdminProvider, useAdmin } from "./AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

function AdminContent({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail?: string;
}) {
  const { sidebarState } = useAdmin();

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";

  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <AdminHeader userEmail={userEmail} />

      {/* Main content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ease-in-out ${
          isOpen ? "ml-64" : isCollapsed ? "ml-20" : "ml-0"
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayoutClient({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail?: string;
}) {
  return (
    <AdminProvider>
      <AdminContent userEmail={userEmail}>{children}</AdminContent>
    </AdminProvider>
  );
}
