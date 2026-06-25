"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  readConsentCookie,
  type ConsentState,
} from "@/lib/consent";

// Live consent state. `initial` comes from the server-read cookie so SSR and the
// first client render agree (no hydration flash, and consented returning
// visitors load tracking without waiting for an effect).
export function useConsent(initial: ConsentState = "unknown"): ConsentState {
  const [state, setState] = useState<ConsentState>(initial);

  useEffect(() => {
    // Re-sync from the real cookie on mount: covers a choice made in another tab
    // or a stale server-passed value.
    setState(readConsentCookie());
    const onChange = (e: Event) =>
      setState((e as CustomEvent<ConsentState>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return state;
}
