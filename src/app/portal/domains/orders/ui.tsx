import {
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  TriangleAlert,
  CalendarX,
  type LucideIcon,
} from "lucide-react";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  type OrderStatus,
  type OrderTone,
} from "@/lib/domains/order-status";

/**
 * Order presentation helpers. Status is shown as TEXT + ICON (never colour
 * alone) for accessibility; tone drives the colour, the label carries meaning.
 */

const TONE_CLASS: Record<OrderTone, string> = {
  neutral: "border-slate-600 bg-slate-700/40 text-slate-300",
  warning: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  positive: "border-green-500/30 bg-green-500/15 text-green-300",
  critical: "border-red-500/30 bg-red-500/15 text-red-300",
};

const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  DRAFT: FileText,
  CHECKOUT_CREATED: Clock,
  PAID_AWAITING_REGISTRATION: CircleCheck,
  PAYMENT_FAILED: TriangleAlert,
  EXPIRED: CalendarX,
  CANCELLED: CircleX,
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[ORDER_STATUS_TONE[status]]}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(t));
}

const OP_LABEL: Record<string, string> = {
  register: "Registrering",
  renew: "Förnyelse",
  transfer: "Transfer",
};
export function operationLabel(op: string): string {
  return OP_LABEL[op] ?? op;
}
