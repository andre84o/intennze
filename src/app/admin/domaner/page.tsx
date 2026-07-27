import { requireAdminPage } from "@/lib/auth/adminGuard";
import DomainDiagnosticsClient from "./DomainDiagnosticsClient";

export const metadata = { title: "Domäner (diagnostik) | Admin" };

/**
 * Admin domain diagnostics. Read-only Hostup insight: provider price, renewal,
 * premium, registrar-fee requirement, supported periods, raw state, registry
 * requirements. Admin-only (page guard + service guard). No big panel by design.
 */
export default async function AdminDomainsDiagnosticsPage() {
  await requireAdminPage();
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Domäner – diagnostik</h1>
        <p className="text-gray-500">
          Read-only Hostup-uppslag för admin. Visar leverantörspris och rådata. Ingen order skapas.
        </p>
      </div>
      <DomainDiagnosticsClient />
    </div>
  );
}
