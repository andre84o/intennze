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

  // Hide the marketing header/footer on app shells that provide their own
  // navigation (admin + customer portal) and on login/demo pages.
  const hideLayout =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/portal") ||
    pathname === "/login" ||
    pathname.startsWith("/demo");

  return (
    <>
      {!hideLayout && header}
      {children}
      {!hideLayout && footer}
    </>
  );
}
