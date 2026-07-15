"use client";

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useAdmin } from "./AdminContext";
import CrmIcon from "./CrmIcon";

interface MenuItem {
  label: string;
  href: string;
  iconPath: string;
  iconPath2?: string;
  // Optional custom icon renderer. When set, it replaces the default
  // stroke-based <svg> for this item (e.g. the filled CRM icon).
  renderIcon?: (className: string) => ReactNode;
}

const defaultMenuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    iconPath: "M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z",
  },
  {
    label: "Kunder",
    href: "/admin/kunder",
    iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    label: "Leads",
    href: "/admin/leads",
    iconPath: "M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z",
  },
  {
    label: "CRM",
    href: "/admin/crm",
    iconPath: "",
    renderIcon: (className: string) => <CrmIcon className={className} />,
  },
  {
    label: "Fakturering",
    href: "/admin/fakturering",
    iconPath: "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  },
  {
    label: "Meddelanden",
    href: "/admin/meddelanden",
    iconPath: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  },
  {
    label: "Koder",
    href: "/admin/koder",
    iconPath: "M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5",
  },
  {
    label: "Staff",
    href: "/admin/staff",
    iconPath: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    label: "Inställningar",
    href: "/admin/installningar",
    iconPath: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
    iconPath2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

// Hrefs that staff (non-admin) users are allowed to see in the sidebar.
// Admins see everything; this is presentation-only — server guards/RLS remain
// the real access control.
const STAFF_VISIBLE_HREFS = new Set(["/admin", "/admin/kunder", "/admin/crm"]);

function filterMenuByRole(
  items: MenuItem[],
  role: "admin" | "staff",
  _commissionEligible: boolean
): MenuItem[] {
  // The company sales overview now lives on the /admin Dashboard behind an
  // admin-only section toggle (see DashboardTabs); there is no separate sidebar
  // entry. Staff see their own commission on the Dashboard instead.
  if (role === "admin") return items;
  return items.filter((item) => STAFF_VISIBLE_HREFS.has(item.href));
}

function initialsOf(name: string, email: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

// Active nav pill — violet gradient (design token #6E5CF3 → #8b7bff). Shadow is
// kept soft + tight so it doesn't bleed onto neighbouring items.
const ACTIVE_NAV_STYLE = {
  background: "linear-gradient(135deg,#6E5CF3,#8b7bff)",
  color: "#fff",
  boxShadow: "0 6px 14px -8px rgba(109,94,246,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
} as const;

// Uniform hover for all neutral (non-active) items so every button reacts the
// same way — an even, clearly-visible violet-grey tint.
const NEUTRAL_ITEM =
  "group flex items-center rounded-[13px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors";
const NEUTRAL_HOVER = "text-[#67637E] hover:bg-[#F1EFFA] hover:text-[#211D33]";

export default function AdminSidebar() {
  const { sidebarState, setSidebarState, openSidebar, role, commissionEligible, userEmail, userName } =
    useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    filterMenuByRole(defaultMenuItems, role, commissionEligible)
  );
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";
  const isHidden = sidebarState === "hidden";

  // Expand only when explicitly opened (click), not on hover
  const shouldExpand = isOpen;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Close (collapse) when clicking outside the sidebar while it's open
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setSidebarState("collapsed");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setSidebarState]);

  // Load sidebar order from database
  useEffect(() => {
    const loadSidebarOrder = async () => {
      try {
        const response = await fetch("/api/preferences/sidebar-order");
        if (response.ok) {
          const data = await response.json();
          if (data.sidebarOrder && Array.isArray(data.sidebarOrder)) {
            const orderedItems = data.sidebarOrder
              .map((href: string) => defaultMenuItems.find((item) => item.href === href))
              .filter(Boolean) as MenuItem[];

            // Add any new items that weren't in the saved order
            const savedHrefs = new Set(data.sidebarOrder);
            const newItems = defaultMenuItems.filter((item) => !savedHrefs.has(item.href));

            // Apply the role filter AFTER building the list so staff never see
            // hidden items even when a saved order includes them.
            setMenuItems(
              filterMenuByRole([...orderedItems, ...newItems], role, commissionEligible)
            );
          }
        }
      } catch (error) {
        console.error("Failed to load sidebar order:", error);
      }
    };

    loadSidebarOrder();
  }, [role, commissionEligible]);

  // Save sidebar order to database
  const saveSidebarOrder = useCallback(async (items: MenuItem[]) => {
    try {
      const sidebarOrder = items.map((item) => item.href);
      await fetch("/api/preferences/sidebar-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarOrder }),
      });
    } catch (error) {
      console.error("Failed to save sidebar order:", error);
    }
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverItem(index);
  };

  const handleDragEnd = () => {
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      const newItems = [...menuItems];
      const [draggedMenuItem] = newItems.splice(draggedItem, 1);
      newItems.splice(dragOverItem, 0, draggedMenuItem);
      setMenuItems(newItems);
      saveSidebarOrder(newItems);
    }
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const labelHidden = `whitespace-nowrap transition-all duration-300 ${
    shouldExpand ? "opacity-100" : "w-0 overflow-hidden opacity-0"
  }`;

  return (
    <aside
      ref={asideRef}
      onClick={isCollapsed ? openSidebar : undefined}
      style={{ borderRight: "1px solid #EFEDF6" }}
      className={`fixed left-0 top-0 z-40 flex h-full flex-col overflow-hidden bg-white [font-family:var(--font-jakarta)] transition-all duration-300 ease-in-out ${
        shouldExpand ? "w-52 sm:w-64" : isCollapsed ? "w-14 cursor-pointer sm:w-20" : "w-0 -translate-x-full"
      }`}
    >
      <div
        className={`flex h-full flex-col ${isHidden ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
      >
        {/* Logo */}
        <div className="flex h-14 items-center px-3 sm:h-16 sm:px-5" style={{ borderBottom: "1px solid #EFEDF6" }}>
          <Link
            href="/admin"
            onClick={(e) => {
              if (isCollapsed) e.preventDefault();
            }}
            className={`flex items-center ${shouldExpand ? "gap-3" : "w-full justify-center"}`}
          >
            <span
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px]"
              style={{
                background: "linear-gradient(135deg,#6E5CF3,#9E8CFF)",
                boxShadow: "0 6px 14px -8px rgba(109,94,246,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 13l4 4 12-12" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={labelHidden}>
              <span className="block text-[15.5px] font-extrabold leading-tight tracking-[-0.3px]" style={{ color: "#211D33" }}>
                Intenzze
              </span>
              <span className="block text-[9.5px] font-bold uppercase leading-tight tracking-[1.2px]" style={{ color: "#A7A3BD" }}>
                Dashbord
              </span>
            </span>
          </Link>
        </div>

        {/* Edit mode toggle */}
        {shouldExpand && (
          <div className="px-3 pt-3 sm:px-4">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              title={isEditMode ? "Klar" : "Ändra ordning"}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] transition-all"
              style={
                isEditMode
                  ? { background: "#EDE9FC", color: "#6E5CF3", border: "1px solid #DDD6F7" }
                  : { background: "#F4F2FB", color: "#8A87A0" }
              }
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 sm:p-4">
          {shouldExpand && (
            <div
              className="px-3 pb-2 pt-1 text-[9.5px] font-bold uppercase tracking-[1.4px]"
              style={{ color: "#BBB7CC" }}
            >
              Meny
            </div>
          )}
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;
            const isDragging = draggedItem === index;
            const isDragOver = dragOverItem === index;

            return (
              <div
                key={item.href}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-[#9E8CFF]" : ""}`}
              >
                <Link
                  href={isEditMode ? "#" : item.href}
                  onClick={(e) => {
                    if (isEditMode || isCollapsed) e.preventDefault();
                  }}
                  style={isActive ? ACTIVE_NAV_STYLE : undefined}
                  className={`${NEUTRAL_ITEM} ${shouldExpand ? "gap-3" : "justify-center"} ${
                    isActive ? "" : NEUTRAL_HOVER
                  } ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {isEditMode && shouldExpand && (
                    <span className="flex-shrink-0 text-[#B4B0C7]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </span>
                  )}
                  <span
                    className={`flex-shrink-0 ${
                      isActive
                        ? "text-white"
                        : // Filled custom icons (e.g. CRM) antialias lighter than the
                          // stroke icons at 18px, so give them a darker resting grey
                          // that reads at the same weight. Hover/active stay identical.
                          `${item.renderIcon ? "text-[#6A6680]" : "text-[#8A87A0]"} group-hover:text-[#6E5CF3]`
                    } transition-colors`}
                  >
                    {item.renderIcon ? (
                      item.renderIcon("h-[18px] w-[18px]")
                    ) : (
                      <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                        {item.iconPath2 && <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath2} />}
                      </svg>
                    )}
                  </span>
                  <span className={labelHidden}>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="space-y-2 p-3 sm:p-4" style={{ borderTop: "1px solid #EFEDF6" }}>
          {/* View public site */}
          <Link
            href="/"
            onClick={(e) => {
              if (isCollapsed) e.preventDefault();
            }}
            className={`${NEUTRAL_ITEM} ${NEUTRAL_HOVER} ${shouldExpand ? "gap-3" : "justify-center"}`}
          >
            <span className="flex-shrink-0 text-[#8A87A0] transition-colors group-hover:text-[#6E5CF3]">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.7">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </span>
            <span className={labelHidden}>Visa sidan</span>
          </Link>

          {/* User card — the lavender card chrome only shows when expanded; when
              collapsed it's just the centered avatar (no oblong box around it). */}
          <div
            className={`flex items-center rounded-[16px] ${shouldExpand ? "gap-3 p-3" : "justify-center"}`}
            style={
              shouldExpand
                ? { background: "linear-gradient(160deg,#F8F6FD,#F3F1FA)", border: "1px solid #EEECF7" }
                : undefined
            }
          >
            <span
              className={`flex flex-shrink-0 items-center justify-center rounded-[12px] font-bold text-white ${
                shouldExpand ? "h-10 w-10 text-[14px]" : "h-9 w-9 text-[13px]"
              }`}
              style={{ background: "linear-gradient(135deg,#c9c2ff,#8b7bff)", boxShadow: "0 6px 12px -8px rgba(109,94,246,0.4)" }}
            >
              {initialsOf(userName, userEmail)}
            </span>
            <span className={`min-w-0 ${labelHidden}`}>
              <span className="block truncate text-[13px] font-bold" style={{ color: "#211D33" }}>
                {userName || "Konto"}
              </span>
              <span className="block truncate text-[11px] font-medium" style={{ color: "#A7A3BD" }}>
                {userEmail}
              </span>
            </span>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title="Logga ut"
            className={`${NEUTRAL_ITEM} w-full text-[#C05470] hover:bg-[#FBEEF1] ${
              shouldExpand ? "gap-3" : "justify-center"
            }`}
          >
            <span className="flex-shrink-0">
              <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h7a2 2 0 002-2v-1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h11m0 0l-3.5-3.5M21 12l-3.5 3.5" />
              </svg>
            </span>
            <span className={labelHidden}>Logga ut</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
