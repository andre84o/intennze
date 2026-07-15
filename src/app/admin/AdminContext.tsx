"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";

// Desktop has 3 states: "open" (full), "collapsed" (icons only), "hidden".
// Mobile has only 2: "open" (full) and "hidden" (completely closed) — the
// icon-rail "collapsed" state is never used on mobile.
type SidebarState = "open" | "collapsed" | "hidden";

interface AdminContextType {
  sidebarState: SidebarState;
  setSidebarState: (state: SidebarState) => void;
  toggleSidebar: () => void;
  openSidebar: () => void;
  /** Close to the resting state for the viewport: hidden on mobile, collapsed on desktop. */
  closeSidebar: () => void;
  /** True on small (< sm / 640px) screens. */
  isMobile: boolean;
  role: "admin" | "staff";
  commissionEligible: boolean;
  userEmail: string;
  userName: string;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({
  children,
  role,
  commissionEligible,
  userEmail,
  userName,
}: {
  children: ReactNode;
  role: "admin" | "staff";
  commissionEligible: boolean;
  userEmail: string;
  userName: string;
}) {
  // Start hidden so mobile renders cleanly with no icon-rail flash (server +
  // first client render match). Desktop is promoted to the icon rail on mount.
  const [sidebarState, setSidebarState] = useState<SidebarState>("hidden");
  const [isMobile, setIsMobile] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setSidebarState((prev) => {
        if (mobile) {
          // Mobile: only open or hidden — collapse the icon rail to hidden.
          return prev === "collapsed" ? "hidden" : prev;
        }
        // Desktop: promote the initial hidden default to the icon rail once, but
        // never override an explicit open/hidden choice on later resizes.
        if (!initialized.current) return "collapsed";
        return prev;
      });
      initialized.current = true;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarState((prev) => {
      // Mobile: 2-step — fully open ↔ fully hidden.
      if (isMobile) return prev === "open" ? "hidden" : "open";
      // Desktop: 3-step cycle — open -> collapsed -> hidden -> open.
      if (prev === "open") return "collapsed";
      if (prev === "collapsed") return "hidden";
      return "open";
    });
  }, [isMobile]);

  const openSidebar = useCallback(() => setSidebarState("open"), []);
  const closeSidebar = useCallback(
    () => setSidebarState(isMobile ? "hidden" : "collapsed"),
    [isMobile]
  );

  return (
    <AdminContext.Provider
      value={{
        sidebarState,
        setSidebarState,
        toggleSidebar,
        openSidebar,
        closeSidebar,
        isMobile,
        role,
        commissionEligible,
        userEmail,
        userName,
      }}
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
