"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isStatusFilter, statusLabels, type Order, type StatusFilter } from "@/lib/orders";

const currency = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });

async function fetchOrders(status: StatusFilter): Promise<Order[]> {
  const response = await fetch(`/api/orders?status=${status}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data: { orders: Order[] } = await response.json();
  return data.orders;
}

async function cancelOrder(id: string): Promise<Order> {
  const response = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
  const data: { order?: Order; error?: string } = await response.json();
  if (!response.ok || !data.order) throw new Error(data.error ?? "The order could not be cancelled.");
  return data.order;
}

export function OrdersPanel({ canCancel }: { canCancel: boolean }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const orders = useQuery({
    queryKey: ["orders", status],
    queryFn: () => fetchOrders(status),
  });

  const cancel = useMutation({
    mutationFn: cancelOrder,
    onSuccess: (order) => {
      setMessage(`${order.id} cancelled.`);
      return queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error) => setMessage(error.message),
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="status" className="text-sm font-medium">Status</label>
        <select
          id="status"
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            if (isStatusFilter(value)) setStatus(value);
          }}
          className="rounded border border-gray-400 px-2 py-1"
        >
          <option value="all">All</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <p role="status" className="min-h-5 text-sm">
        {message}
      </p>

      {orders.isPending ? (
        <p>Loading orders...</p>
      ) : orders.isError ? (
        <div role="alert" className="space-y-2 rounded border border-red-300 bg-red-50 p-4">
          <p>Orders could not be loaded.</p>
          <button type="button" onClick={() => orders.refetch()} className="underline">
            Tekrar dene
          </button>
        </div>
      ) : orders.data.length === 0 ? (
        <p>No orders in this filter.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Order list</caption>
          <thead>
            <tr className="border-b">
              <th scope="col" className="py-2">Order</th>
              <th scope="col">Customer</th>
              <th scope="col">Amount</th>
              <th scope="col">Status</th>
              {canCancel && <th scope="col">Action</th>}
            </tr>
          </thead>
          <tbody>
            {orders.data.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="py-2 font-medium">{order.id}</td>
                <td>{order.customer}</td>
                <td>{currency.format(order.total)}</td>
                <td>{statusLabels[order.status]}</td>
                {canCancel && (
                  <td>
                    {order.status === "preparing" && (
                      <button
                        type="button"
                        onClick={() => cancel.mutate(order.id)}
                        disabled={cancel.isPending}
                        className="text-red-700 underline disabled:opacity-60"
                      >Cancel</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
