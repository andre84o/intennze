"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PHONE_DISPLAY = "+46 76 007 66 56";
const PHONE_HREF = "tel:+46760076656";
const EMAIL = "info@intenzze.com";

export default function ContactButton({
  label,
  className,
  fullWidth = false,
}: {
  label: string;
  className: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"}`}
    >
      {/* Popover menu (opens upward) */}
      <div
        className={`absolute bottom-full left-0 mb-3 z-20 origin-bottom transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        } ${fullWidth ? "w-full" : "w-64"}`}
      >
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-2 shadow-2xl shadow-black/40">
          <a
            href={PHONE_HREF}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800 group/item"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 transition-colors group-hover/item:bg-cyan-500/20">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Telefon
              </p>
              <p className="text-sm font-medium text-white">{PHONE_DISPLAY}</p>
            </div>
          </a>

          <Link
            href="/kontakt#form"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800 group/item"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 transition-colors group-hover/item:bg-purple-500/20">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                E-post
              </p>
              <p className="truncate text-sm font-medium text-white">{EMAIL}</p>
            </div>
          </Link>
        </div>
        {/* Caret pointing down at the button */}
        <div className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-slate-700 bg-slate-900" />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={className}
      >
        {label}
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${
            open ? "-rotate-90" : "group-hover:translate-x-1"
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </button>
    </div>
  );
}
