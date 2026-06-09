"use client";
import { useEffect, useRef } from "react";
import { track } from "@/utils/metaPixel";

// Lets us tell whether ad visitors actually engage with a landing page or
// bounce immediately. Fires three kinds of signal to every analytics surface
// we already have wired up:
//   - Meta Pixel custom events  (visible in Events Manager)
//   - GA4 via gtag              (visible in GA4 reports/realtime)
//   - GTM dataLayer             (for any GTM tags forwarding onward)
// Frontend-only and PII-free — we only send page name, scroll %, dwell seconds
// and the href a visitor clicked.

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };
type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

function sendDataLayer(event: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as DataLayerWindow;
  if (Array.isArray(w.dataLayer)) w.dataLayer.push(event);
}

function sendGtag(event: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag === "function") w.gtag("event", event, params);
}

// One call = same signal to Pixel + GA4 + GTM. metaEvent is the (CamelCase)
// custom event name in Meta; gaEvent is the snake_case GA4 event name.
function emit(
  metaEvent: string,
  gaEvent: string,
  params: Record<string, unknown>
): void {
  track("trackCustom", metaEvent, params);
  sendGtag(gaEvent, params);
  sendDataLayer({ event: gaEvent, ...params });
}

const SCROLL_MILESTONES = [25, 50, 75, 90] as const;
const DWELL_SECONDS = [15, 30, 60] as const;

export function useEngagementTracking(pageName: string): void {
  // Each milestone/dwell mark fires at most once per page view.
  const firedScroll = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fireScroll = (percent: number) => {
      if (firedScroll.current.has(percent)) return;
      firedScroll.current.add(percent);
      emit("ScrollDepth", "scroll_depth", { page: pageName, percent });
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      // Page already fits on screen → treat as fully seen.
      if (scrollable <= 0) {
        fireScroll(90);
        return;
      }
      const pct = Math.round((window.scrollY / scrollable) * 100);
      for (const m of SCROLL_MILESTONES) {
        if (pct >= m) fireScroll(m);
      }
    };

    // A visitor clicking any real link (e.g. the header nav) is the clearest
    // sign they went looking at the rest of the site.
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      // Ignore in-page jumps and empty hrefs.
      if (!href || href.startsWith("#")) return;
      emit("NavClick", "nav_click", { page: pageName, href });
    };

    const timers = DWELL_SECONDS.map((seconds) =>
      window.setTimeout(
        () => emit("TimeOnPage", "time_on_page", { page: pageName, seconds }),
        seconds * 1000
      )
    );

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    onScroll(); // capture initial state for short pages

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [pageName]);
}
