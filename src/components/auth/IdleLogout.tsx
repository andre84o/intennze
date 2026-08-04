"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Client UX layer for the idle timeout. The SERVER is the authority (signed
 * activity cookie enforced in middleware + API guards); this component only:
 *   • refreshes the server timestamp via a throttled heartbeat on real activity,
 *   • redirects to the server logout route when the local timer fires,
 *   • re-checks with the server when the tab regains focus (covers sleep / new
 *     tab / reopened browser, where the JS timer no longer exists), and
 *   • syncs logout across open tabs (BroadcastChannel + Supabase auth events).
 *
 * Rendered by BOTH the /admin and /portal layouts.
 */

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // mirrors server IDLE_TIMEOUT_MS
const HEARTBEAT_THROTTLE_MS = 60 * 1000; // at most one heartbeat per minute
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;
const AUTH_CHANNEL = "app-auth";
const LOGOUT_URL = "/logout?reason=idle";

export default function IdleLogout() {
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastBeat = 0;
    let done = false;

    const bc =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(AUTH_CHANNEL)
        : null;

    const toLogout = (broadcast: boolean) => {
      if (done) return;
      done = true;
      if (broadcast) {
        try {
          bc?.postMessage({ type: "logout" });
        } catch {
          /* channel closed — ignore */
        }
      }
      window.location.href = LOGOUT_URL;
    };

    const heartbeat = async () => {
      const now = Date.now();
      if (now - lastBeat < HEARTBEAT_THROTTLE_MS) return;
      lastBeat = now;
      try {
        const res = await fetch("/api/admin/heartbeat", {
          method: "POST",
          keepalive: true,
        });
        // Server says the session already expired → tear it down everywhere.
        if (res.status === 401) toLogout(true);
      } catch {
        /* transient network error — the local timer still guards us */
      }
    };

    const resetIdle = () => {
      if (done) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => toLogout(true), IDLE_TIMEOUT_MS);
    };

    const onActivity = () => {
      resetIdle();
      void heartbeat();
    };

    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      // Force a server check on return, bypassing the throttle: if the session
      // expired while the tab was hidden/asleep, the 401 logs us out.
      lastBeat = 0;
      void heartbeat();
    };

    const opts: AddEventListenerOptions = { passive: true };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, opts);
    }
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    if (bc) {
      bc.onmessage = (e: MessageEvent) => {
        if (e.data?.type === "logout") toLogout(false);
      };
    }

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !done) {
        done = true;
        window.location.href = "/login";
      }
    });

    resetIdle();

    return () => {
      done = true;
      if (idleTimer) clearTimeout(idleTimer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity, opts);
      }
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      subscription.unsubscribe();
      bc?.close();
    };
  }, []);

  return null;
}
