"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

export default function AdminIdleLogout() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const logout = async () => {
      if (cancelled) return;
      cancelled = true;
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Even if signOut fails, force-redirect away from admin context.
      }
      router.push("/login?reason=idle");
    };

    const reset = () => {
      if (cancelled) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(logout, IDLE_TIMEOUT_MS);
    };

    const opts: AddEventListenerOptions = { passive: true };
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, reset, opts);
    }

    reset();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, reset, opts);
      }
    };
  }, [router]);

  return null;
}
