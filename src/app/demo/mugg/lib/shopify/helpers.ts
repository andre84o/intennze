import type { Money } from "./types";

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

export function formatPrice(amount: string, currencyCode: string): string {
  return formatMoney({ amount, currencyCode });
}
