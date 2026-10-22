export type OrderStatus = "preparing" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
};

export const statusLabels: Record<OrderStatus, string> = {
  preparing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
};

export type StatusFilter = OrderStatus | "all";

export function isStatusFilter(value: string): value is StatusFilter {
  return value === "all" || value in statusLabels;
}
