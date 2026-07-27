/**
 * Money helpers — integer MINOR units (öre for SEK). Pure, no dependencies.
 *
 * Convention: every *Minor value is an integer in the currency's minor unit.
 * 19900 minor = 199,00 kr. This is deliberately different from invoices.amount
 * (whole kronor) elsewhere in the app — never mix the two without converting.
 */

/** Standard Swedish output VAT for domains, in basis points (2500 = 25%). */
export const DEFAULT_VAT_BASIS_POINTS = 2500;

/** Format a minor-unit amount as sv-SE currency, e.g. 19900 -> "199,00 kr". */
export function formatMinor(minor: number | null | undefined, currency = "SEK"): string {
  if (minor == null || !Number.isFinite(minor)) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/** Format basis points as a percentage, e.g. 2500 -> "25 %". */
export function formatBasisPoints(bps: number | null | undefined): string {
  if (bps == null || !Number.isFinite(bps)) return "—";
  return `${(bps / 100).toLocaleString("sv-SE", { maximumFractionDigits: 2 })} %`;
}

export type VatSplit = {
  netAmountMinor: number;
  vatAmountMinor: number;
  grossAmountMinor: number;
  vatRateBasisPoints: number;
};

/**
 * Split a NET (ex-VAT) amount into net / vat / gross. VAT is computed ONCE on the
 * net total (never per-year) with integer half-up rounding. This is Intennze's
 * OUTPUT VAT — it is never derived from Hostup's provider tax.
 */
export function computeVatSplit(
  netAmountMinor: number,
  vatRateBasisPoints: number = DEFAULT_VAT_BASIS_POINTS
): VatSplit {
  const net = Math.max(0, Math.round(netAmountMinor));
  const vat = Math.round((net * vatRateBasisPoints) / 10000);
  return {
    netAmountMinor: net,
    vatAmountMinor: vat,
    grossAmountMinor: net + vat,
    vatRateBasisPoints,
  };
}

/**
 * Convert a provider (Hostup) amount to minor units for the engine.
 *
 * DOCUMENTED ASSUMPTION: Hostup provider amounts are expressed in MAJOR currency
 * units (e.g. 99 or 99.5 = kronor), matching how Phase 3A surfaces them. They are
 * converted to minor units here so the whole engine works in one integer unit.
 * If live verification shows Hostup already returns minor units, change ONLY this
 * function. FIXED customer-price rules ignore the provider amount, so they are
 * unaffected by this assumption; markup rules depend on it.
 */
export function providerMajorToMinor(amount: number | null | undefined): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}
