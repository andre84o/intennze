"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// 3 states: "open" (full), "collapsed" (icons only), "hidden" (completely hidden)
type SidebarState = "open" | "collapsed" | "hidden";

interface AdminContextType {
  sidebarState: SidebarState;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [sidebarState, setSidebarState] = useState<SidebarState>("collapsed");

  // Cycle: open -> collapsed -> hidden -> open
  const toggleSidebar = () => {
    setSidebarState((prev) => {
      if (prev === "open") return "collapsed";
      if (prev === "collapsed") return "hidden";
      return "open";
    });
  };

  const openSidebar = () => setSidebarState("open");

  return (
    <AdminContext.Provider
      value={{ sidebarState, setSidebarState, toggleSidebar, openSidebar }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}
