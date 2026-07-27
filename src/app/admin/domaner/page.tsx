import { requireAdminPage } from "@/lib/auth/adminGuard";
import DomainDiagnosticsClient from "./DomainDiagnosticsClient";

export const metadata = { title: "Domäner (diagnostik) | Admin" };

/**
 * Admin domain diagnostics. Read-only provider insight: provider price, renewal,
 * premium, registrar-fee requirement, supported periods, raw state, registry
 * requirements. Admin-only (page guard + service guard). No big panel by design.
 */
export default async function AdminDomainsDiagnosticsPage() {
  await requireAdminPage();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Domäner – diagnostik</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Read-only domänuppslag för admin. Visar leverantörspris och rådata. Ingen order skapas.
          </p>
        </div>
      </div>
      <DomainDiagnosticsClient />
    </div>
  );
}
