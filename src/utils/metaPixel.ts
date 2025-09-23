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

export function track(
  method: "track" | "init" | "trackCustom" | string,
  eventName?: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.fbq?.(method, eventName, params);
}
