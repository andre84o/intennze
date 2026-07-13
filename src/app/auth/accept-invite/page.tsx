import { Suspense } from "react";
import AcceptInviteClient from "./AcceptInviteClient";

export const metadata = {
  title: "Accept invite | Intenzze",
};

// PUBLIC page — no admin guard. It completes a Supabase invite in the browser
// (exchange the ?code= for a session, then let the user set a password).
export default function AcceptInvitePage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
            Set your password
          </h1>
          <p className="text-slate-400 mt-2">
            Finish setting up your account to access the admin panel.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl text-slate-300 text-sm">
              Loading…
            </div>
          }
        >
          <AcceptInviteClient />
        </Suspense>
      </div>
    </main>
  );
}
