"use client";

import { useEffect, useState } from "react";
import { readOrderStatus } from "../actions";
import { isOrderStatus, isTerminalOrderStatus, type OrderStatus } from "@/lib/domains/order-status";
import { OrderStatusBadge } from "./ui";

/**
 * Live order-status badge. The PAID state is set only by the verified Stripe
 * webhook, so while an order is still pending this polls the server until it
 * reaches a terminal state. Status changes are announced via aria-live.
 */
export default function OrderStatusClient({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  useEffect(() => {
    // Only poll while the order started in a non-terminal state.
    if (isTerminalOrderStatus(initialStatus)) return;
    let active = true;
    const timer = setInterval(async () => {
      const res = await readOrderStatus(orderId);
      if (!active) return;
      if (res.ok && isOrderStatus(res.data.status)) {
        setStatus(res.data.status);
        if (isTerminalOrderStatus(res.data.status)) clearInterval(timer);
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId, initialStatus]);

  const pending = !isTerminalOrderStatus(status);

  return (
    <div aria-live="polite" className="space-y-2">
      <OrderStatusBadge status={status} />
      {pending && (
        <p className="text-xs text-slate-400" aria-busy="true">
          Bekräftar betalning… sidan uppdateras automatiskt.
        </p>
      )}
    </div>
  );
}
