"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAdmin } from "./AdminContext";

interface AdminHeaderProps {
  userEmail?: string;
}

function initialsOf(name: string, email: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

export default function AdminHeader({ userEmail }: AdminHeaderProps) {
  const { sidebarState, toggleSidebar, openSidebar, userName, userEmail: ctxEmail } = useAdmin();
  const router = useRouter();

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";
  const isHidden = sidebarState === "hidden";

  const email = ctxEmail || userEmail || "";
  const displayName = userName || "Konto";
  const initials = initialsOf(userName, email);

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
      return <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />;
    }
    if (isCollapsed) {
      // Sidebar hide icon (panel with arrow left)
      return (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v16.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 8.25L10.5 12l3.75 3.75" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12h9.75" />
        </>
      );
    }
    // Menu icon (will open)
    return (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    );
  };

  return (
    <>
      {/* Floating open button when sidebar is hidden */}
      {isHidden && (
        <button
          onClick={openSidebar}
          type="button"
          className="fixed left-3 top-3.5 z-50 flex h-8 w-8 items-center justify-center rounded-[10px] bg-white text-[#6A6683] shadow-sm transition-all duration-150 hover:bg-[#F5F4FB] hover:text-[#6E5CF3] active:scale-95 sm:left-4 sm:top-4 sm:h-9 sm:w-9"
          style={{ border: "1px solid #ECEAF5" }}
          aria-label="Öppna sidofält"
        >
          <svg className="pointer-events-none h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Main header */}
      <header
        style={{ borderBottom: "1px solid #ECEAF5" }}
        className={`fixed right-0 top-0 z-30 h-14 bg-white/80 backdrop-blur-md [font-family:var(--font-jakarta)] transition-all duration-300 ease-in-out sm:h-16 ${
          isOpen ? "left-52 sm:left-64" : isCollapsed ? "left-14 sm:left-20" : "left-0"
        }`}
      >
        <div className="flex h-full items-center justify-between px-3 sm:px-6">
          {/* Left side - Toggle button */}
          <div className="flex items-center gap-2 sm:gap-4">
            {!isHidden && !isOpen && (
              <button
                onClick={toggleSidebar}
                type="button"
                className="flex h-8 w-8 select-none items-center justify-center rounded-[10px] bg-white text-[#6A6683] transition-all duration-150 hover:bg-[#F5F4FB] hover:text-[#6E5CF3] active:scale-95 sm:h-10 sm:w-10"
                style={{ border: "1px solid #ECEAF5" }}
                aria-label={isOpen ? "Minimera sidofält" : "Dölj sidofält"}
              >
                <svg className="pointer-events-none h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                  {getToggleIcon()}
                </svg>
              </button>
            )}
          </div>

          {/* Right side - User & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3 pl-3 sm:pl-4" style={{ borderLeft: "1px solid #ECEAF5" }}>
              <div className="hidden text-right sm:block">
                <p className="text-[13px] font-bold" style={{ color: "#211D33" }}>
                  {displayName}
                </p>
                <p className="text-[11px] font-medium" style={{ color: "#A7A3BD" }}>
                  {email || "admin@intenzze.se"}
                </p>
              </div>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[13px] font-bold text-white sm:h-10 sm:w-10"
                style={{ background: "linear-gradient(135deg,#c9c2ff,#8b7bff)", boxShadow: "0 10px 20px -8px rgba(109,94,246,0.6)" }}
              >
                {initials}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-[10px] text-[#C05470] transition-colors hover:bg-[#FBEEF1]"
                title="Logga ut"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.9">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h7a2 2 0 002-2v-1" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h11m0 0l-3.5-3.5M21 12l-3.5 3.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
