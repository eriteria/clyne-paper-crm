import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface NotificationCounts {
  dashboard: number;
  customers: number;
  products: number;
  inventory: number;
  invoices: number;
  payments: number;
  financial: number;
  users: number;
  teams: number;
  settings: number;
  admin: number;
}

interface NotificationMeta {
  overdueInvoices: number;
  lowStockItems: number;
  pendingCustomers: number;
  recentPayments: number;
  inactiveUsers: number;
  availableCredits: number;
  upcomingDueInvoices: number;
}

export const useNotifications = (refreshInterval: number = 60000) => {
  const [counts, setCounts] = useState<NotificationCounts>({
    dashboard: 0,
    customers: 0,
    products: 0,
    inventory: 0,
    invoices: 0,
    payments: 0,
    financial: 0,
    users: 0,
    teams: 0,
    settings: 0,
    admin: 0,
  });
  const [meta, setMeta] = useState<NotificationMeta>({
    overdueInvoices: 0,
    lowStockItems: 0,
    pendingCustomers: 0,
    recentPayments: 0,
    inactiveUsers: 0,
    availableCredits: 0,
    upcomingDueInvoices: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificationCounts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get("/notifications/counts");

      if (response.data.success) {
        setCounts(response.data.data);
        setMeta(response.data.meta);
      }
    } catch (err) {
      console.error("Error fetching notification counts:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();

    // Set up polling interval
    const interval = setInterval(fetchNotificationCounts, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Manual refresh function
  const refresh = () => {
    fetchNotificationCounts();
  };

  return {
    counts,
    meta,
    isLoading,
    error,
    refresh,
  };
};
