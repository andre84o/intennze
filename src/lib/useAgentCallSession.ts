"use client";

import { useCallback, useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { CallSession } from "@/types/database";

export type CallConnState = "connecting" | "connected" | "offline";

// Subscribes to the current agent's own call_sessions row (RLS scopes it to
// auth.uid()) and keeps it live. Used by the desktop indicator and the mobile
// companion — both render from this single source of truth. Never triggers any
// side effects (no Meta).
export function useAgentCallSession() {
  const [session, setSession] = useState<CallSession | null>(null);
  const [conn, setConn] = useState<CallConnState>("connecting");
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (): Promise<CallSession | null> => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb
      .from("call_sessions")
      .select("*")
      .eq("agent_id", user.id)
      .maybeSingle();
    const row = (data as CallSession | null) ?? null;
    setSession(row);
    return row;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    const sb = createClient();

    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (cancelled || !user) {
        setLoading(false);
        return;
      }
      const { data } = await sb
        .from("call_sessions")
        .select("*")
        .eq("agent_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setSession((data as CallSession | null) ?? null);
      setLoading(false);

      channel = sb
        .channel(`call_sessions:${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "call_sessions", filter: `agent_id=eq.${user.id}` },
          (payload) => {
            if (payload.eventType === "DELETE") setSession(null);
            else setSession(payload.new as CallSession);
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setConn("connected");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConn("offline");
          else setConn("connecting");
        });
    })();

    return () => {
      cancelled = true;
      if (channel) sb.removeChannel(channel);
    };
  }, []);

  return { session, conn, loading, refetch };
}
