"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface ConditionalLayoutProps {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}

export default function ConditionalLayout({
  header,
  footer,
  children,
}: ConditionalLayoutProps) {
  const pathname = usePathname();

  // Hide header and footer on admin and login pages
  const hideLayout = pathname.startsWith("/admin") || pathname === "/login";

  return (
    <>
      {!hideLayout && header}
      {children}
      {!hideLayout && footer}
    </>
  );
}
