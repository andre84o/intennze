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
          className="fixed top-3 sm:top-4 left-3 sm:left-4 z-50 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          aria-label="Öppna sidofält"
        >
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none"
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
        className={`fixed top-0 right-0 h-14 sm:h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 transition-all duration-300 ease-in-out ${
          isOpen ? "left-52 sm:left-64" : isCollapsed ? "left-14 sm:left-20" : "left-0"
        }`}
      >
        <div className="h-full px-3 sm:px-6 flex items-center justify-between">
          {/* Left side - Toggle button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {!isHidden && (
              <button
                onClick={toggleSidebar}
                type="button"
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 active:scale-95 border border-gray-200 hover:border-gray-300 transition-all duration-150 cursor-pointer select-none"
                aria-label={isOpen ? "Minimera sidofält" : "Dölj sidofält"}
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  {getToggleIcon()}
                </svg>
              </button>
            )}
          </div>

          {/* Right side - User & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* User profile */}
            <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-gray-200">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">Admin</p>
                <p className="text-xs text-gray-500">{userEmail || "admin@intenzze.se"}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-[2px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <span className="font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-purple-500 text-xs sm:text-sm">
                    A
                  </span>
                </div>
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Logga ut"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
