// Typed Meta Pixel helpers
declare global {
  interface Window {
    fbq?: (
      method: "track" | "init" | "trackCustom" | string,
      eventName?: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export function trackContact(): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "Contact");
}

export function trackPageView(pageName: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("trackCustom", "PageVisit", { page: pageName });
}

export function trackLead(data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "Lead", data);
}

export function trackViewContent(contentName: string, contentCategory?: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "ViewContent", {
    content_name: contentName,
    content_category: contentCategory,
  });
}

export function track(
  method: "track" | "init" | "trackCustom" | string,
  eventName?: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.fbq?.(method, eventName, params);
}

