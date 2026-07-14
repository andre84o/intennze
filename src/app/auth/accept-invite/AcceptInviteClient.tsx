"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Phase = "checking" | "ready" | "no-session" | "saving" | "done";

export default function AcceptInviteClient() {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // On mount: establish a session from the invite link.
  // The link can arrive as a PKCE ?code= (exchange it) or the session may
  // already be present (implicit flow / already exchanged).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // Fall through to the session check below; if that also fails we
            // show the expired-link message.
            console.error("[accept-invite] exchangeCodeForSession failed:", exchangeError);
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;
        setPhase(session ? "ready" : "no-session");
      } catch (e) {
        if (cancelled) return;
        console.error("[accept-invite] init failed:", e);
        setPhase("no-session");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPhase("saving");
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPhase("ready");
      return;
    }

    setPhase("done");
    router.push("/admin");
    router.refresh();
  };

  if (phase === "checking") {
    return (
      <div className="p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl text-slate-300 text-sm">
        Verifying your invite link…
      </div>
    );
  }

  if (phase === "no-session") {
    return (
      <div className="p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
        <p className="text-slate-300 text-sm">
          This invite link is invalid or has expired. Please ask an administrator to send you
          a new invite.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full text-center py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
        <div className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              New password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-2">
              Confirm password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={phase === "saving" || phase === "done"}
          className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === "saving"
            ? "Saving…"
            : phase === "done"
            ? "Redirecting…"
            : "Set password"}
        </button>
      </div>
    </form>
  );
}
