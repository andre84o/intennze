"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAdmin } from "./AdminContext";

interface AdminHeaderProps {
  userEmail?: string;
}

export default function AdminHeader({ userEmail }: AdminHeaderProps) {
  const { sidebarState, toggleSidebar, openSidebar } = useAdmin();
  const router = useRouter();

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";
  const isHidden = sidebarState === "hidden";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Get icon based on state
  const getToggleIcon = () => {
    if (isOpen) {
      // Chevron left (will collapse)
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 19.5L8.25 12l7.5-7.5"
        />
      );
    }
    if (isCollapsed) {
      // X icon (will hide)
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      );
    }
    // Menu icon (will open)
    return (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
      />
    );
  };

  return (
    <>
      {/* Floating open button when sidebar is hidden */}
      {isHidden && (
        <button
          onClick={openSidebar}
          type="button"
          className="fixed top-4 left-4 z-50 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          aria-label="Öppna sidofält"
        >
          <svg
            className="w-6 h-6 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      )}

      {/* Main header */}
      <header
        className={`fixed top-0 right-0 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-30 transition-all duration-300 ease-in-out ${
          isOpen ? "left-64" : isCollapsed ? "left-20" : "left-0"
        }`}
      >
        <div className="h-full px-6 flex items-center justify-between">
          {/* Left side - Toggle button */}
          <div className="flex items-center gap-4">
            {!isHidden && (
              <button
                onClick={toggleSidebar}
                type="button"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 active:bg-slate-600 active:scale-95 border border-slate-700 hover:border-slate-600 transition-all duration-150 cursor-pointer select-none"
                aria-label={isOpen ? "Minimera sidofält" : "Dölj sidofält"}
              >
                <svg
                  className="w-5 h-5 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  {getToggleIcon()}
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-white">Admin Panel</h1>
          </div>

          {/* Right side - User info & logout */}
          <div className="flex items-center gap-4">
            {userEmail && (
              <span className="text-sm text-slate-400 hidden sm:block">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-all duration-200"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
              <span className="hidden sm:inline">Logga ut</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
