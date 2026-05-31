"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { lookupEmailByUsername } from "./actions";

function getErrorMessage(error: { message: string; status?: number }): string {
  const msg = error.message.toLowerCase();

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Fel uppgifter. Kontrollera användarnamn/e-post och lösenord.";
  }
  if (msg.includes("email not confirmed")) {
    return "E-postadressen är inte bekräftad. Kontrollera din inkorg eller be admin att bekräfta kontot.";
  }
  if (msg.includes("user not found")) {
    return "Ingen användare hittades.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "För många inloggningsförsök. Vänta en stund och försök igen.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Nätverksfel. Kontrollera din internetanslutning.";
  }
  if (msg.includes("password")) {
    return "Lösenordet måste vara minst 6 tecken.";
  }

  return `Inloggningen misslyckades: ${error.message}`;
}

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirect =
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//") &&
    !redirectParam.startsWith("/\\")
      ? redirectParam
      : "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let email = identifier.trim();

    // If not an email address, look up by username
    if (!email.includes("@")) {
      const resolved = await lookupEmailByUsername(email);
      if (!resolved) {
        setError("Inget konto hittades med detta användarnamn.");
        setLoading(false);
        return;
      }
      email = resolved;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(getErrorMessage(error));
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Användarnamn eller e-post
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              placeholder="användarnamn eller e-post"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-300 mb-2"
            >
              Lösenord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
          disabled={loading}
          className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loggar in..." : "Logga in"}
        </button>
      </div>
    </form>
  );
}
