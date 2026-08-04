import { redirect } from "next/navigation";
import { getEffectiveActor } from "@/lib/auth/customerView";
import { exitCustomerView } from "@/app/admin/kunder/actions";
import IdleLogout from "@/components/auth/IdleLogout";
import PortalNav from "./PortalNav";
import PortalBottomNav from "./PortalBottomNav";
import PortalCartButton from "./PortalCartButton";

/**
 * Protected customer portal shell.
 *
 * Access (all decided server-side):
 *   • Real CUSTOMER users  → allowed (their own portal).
 *   • ADMIN in customer-view → allowed, with the impersonation banner.
 *   • Everyone else (active staff, admin NOT in a view, logged-out) → bounced.
 *
 * When in customer-view the banner name is fetched server-side (RLS-verified);
 * it is never taken from the cookie or the client.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getEffectiveActor();

  if (!actor.realUserId) {
    redirect("/login");
  }

  // The portal is customer-only. An admin may enter ONLY via a verified
  // customer-view; active staff and non-view admins have no portal access.
  if (!actor.isCustomerView && actor.realRole !== "customer") {
    redirect(
      actor.realRole === "admin" || actor.realRole === "staff" ? "/admin" : "/login"
    );
  }

  let bannerName: string | null = null;
  if (actor.isCustomerView && actor.viewedCustomerId) {
    const { data: customer } = await actor.supabase
      .from("customers")
      .select("first_name, last_name, company_name")
      .eq("id", actor.viewedCustomerId)
      .maybeSingle<{
        first_name: string;
        last_name: string;
        company_name: string | null;
      }>();

    // Cookie references a customer that no longer exists — drop the view.
    if (!customer) {
      redirect("/admin/kunder");
    }

    bannerName =
      (customer.company_name && customer.company_name.trim()) ||
      `${customer.first_name} ${customer.last_name}`.trim();
  }

  // Account chip: the logged-in user's email + best-available display name.
  const accountEmail = actor.user?.email ?? "";
  let accountName = accountEmail;
  if (actor.isCustomerView) {
    accountName = bannerName ?? accountEmail;
  } else {
    try {
      const { data } = await actor.supabase.rpc("get_portal_customer_contact", { p_customer_id: null });
      const row = Array.isArray(data) ? (data[0] as { first_name?: string; last_name?: string } | undefined) : null;
      const full = row ? `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() : "";
      if (full) accountName = full;
    } catch {
      /* fall back to email */
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <IdleLogout />
      {actor.isCustomerView && (
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            You are viewing the portal as{" "}
            <span className="font-semibold">{bannerName}</span>
          </p>
          <form action={exitCustomerView}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-100"
            >
              Exit customer view
            </button>
          </form>
        </div>
      )}
      <PortalNav userName={accountName} userEmail={accountEmail} />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-12 md:pb-12 md:pt-16">{children}</main>
      <PortalCartButton />
      <PortalBottomNav />
    </div>
  );
}
