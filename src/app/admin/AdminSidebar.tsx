"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAdmin } from "./AdminContext";

interface MenuItem {
  label: string;
  href: string;
  iconPath: string;
  iconPath2?: string;
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
    label: "Offerter",
    href: "/admin/offerter",
    iconPath: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z",
  },
  {
    label: "Försäljning",
    href: "/admin/forsaljning",
    iconPath: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
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
    label: "Inställningar",
    href: "/admin/installningar",
    iconPath: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z",
    iconPath2: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
];

export default function AdminSidebar() {
  const { sidebarState } = useAdmin();
  const pathname = usePathname();
  const [isHovering, setIsHovering] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const isOpen = sidebarState === "open";
  const isCollapsed = sidebarState === "collapsed";
  const isHidden = sidebarState === "hidden";

  // Expand on hover when collapsed
  const shouldExpand = isOpen || (isCollapsed && isHovering);

  // Load sidebar order from database
  useEffect(() => {
    const loadSidebarOrder = async () => {
      try {
        const response = await fetch("/api/preferences/sidebar-order");
        if (response.ok) {
          const data = await response.json();
          if (data.sidebarOrder && Array.isArray(data.sidebarOrder)) {
            const orderedItems = data.sidebarOrder
              .map((href: string) => defaultMenuItems.find(item => item.href === href))
              .filter(Boolean) as MenuItem[];

            // Add any new items that weren't in the saved order
            const savedHrefs = new Set(data.sidebarOrder);
            const newItems = defaultMenuItems.filter(item => !savedHrefs.has(item.href));

            setMenuItems([...orderedItems, ...newItems]);
          }
        }
      } catch (error) {
        console.error("Failed to load sidebar order:", error);
      }
    };

    loadSidebarOrder();
  }, []);

  // Save sidebar order to database
  const saveSidebarOrder = useCallback(async (items: MenuItem[]) => {
    try {
      const sidebarOrder = items.map(item => item.href);
      await fetch("/api/preferences/sidebar-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarOrder })
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

  return (
    <aside
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-xl border-r border-gray-200 z-40 transition-all duration-300 ease-in-out ${
        shouldExpand ? "w-52 sm:w-64" : isCollapsed ? "w-14 sm:w-20" : "w-0 -translate-x-full"
      }`}
    >
      <div className={`${isHidden ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}>
        {/* Logo */}
        <div className="h-14 sm:h-16 flex items-center px-3 sm:px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 relative">
              <Image
                src="/favicon20.png"
                alt="Intenzze Logo"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
            <span
              className={`font-bold text-sm sm:text-base text-gray-900 transition-opacity duration-300 ${
                shouldExpand ? "opacity-100" : "opacity-0 w-0"
              }`}
            >
              intenzze
            </span>
          </Link>
        </div>

        {/* Edit mode toggle */}
        {shouldExpand && (
          <div className="px-2 sm:px-4 pt-2">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`w-full flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                isEditMode
                  ? "bg-blue-100 text-blue-600 border border-blue-200"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              {isEditMode ? "Klar" : "Ändra ordning"}
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-2 sm:p-4 space-y-1 sm:space-y-2">
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
                className={`${isDragging ? "opacity-50" : ""} ${isDragOver ? "border-t-2 border-blue-400" : ""}`}
              >
                <Link
                  href={isEditMode ? "#" : item.href}
                  onClick={(e) => isEditMode && e.preventDefault()}
                  className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 text-blue-600 border border-blue-100"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  } ${isEditMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  {isEditMode && (
                    <span className="text-gray-400 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                      </svg>
                    </span>
                  )}
                  <span
                    className={`flex-shrink-0 ${
                      isActive ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"
                    } transition-colors`}
                  >
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath} />
                      {item.iconPath2 && (
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.iconPath2} />
                      )}
                    </svg>
                  </span>
                  <span
                    className={`whitespace-nowrap text-sm sm:text-base transition-all duration-300 ${
                      shouldExpand ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 group"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            <span
              className={`whitespace-nowrap text-sm sm:text-base transition-all duration-300 ${
                shouldExpand ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              Visa sidan
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
