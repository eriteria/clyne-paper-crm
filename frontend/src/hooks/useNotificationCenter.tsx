"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "progress" | "connected";
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  isConnected: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Add notification (or update if it's an update message)
  const addNotification = useCallback(
    (notification: Notification & { isUpdate?: boolean }) => {
      setNotifications((prev) => {
        // If this is an update, replace existing notification with same ID
        if (notification.isUpdate) {
          const existingIndex = prev.findIndex((n) => n.id === notification.id);
          if (existingIndex !== -1) {
            // Update existing notification - remove isUpdate property
            const updated = [...prev];
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { isUpdate, ...notificationWithoutUpdate } = notification;
            updated[existingIndex] = notificationWithoutUpdate as Notification;
            console.log(`🔄 Updated notification ${notification.id}`);
            return updated;
          }
        }

        // Otherwise, add as new notification
        return [notification, ...prev];
      });

      // Show browser notification only for new notifications (not updates)
      if (
        !notification.isUpdate &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        });
      }
    },
    []
  );

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Clear notification
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Connect to SSE stream
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsConnected(false);
      return;
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    let eventSourceWithAuth: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;
    let tokenRefreshed = false; // Track if we've already tried refreshing

    const refreshAccessToken = async (): Promise<string | null> => {
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          console.error("❌ No refresh token available");
          return null;
        }

        console.log("🔄 Attempting to refresh access token...");
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        const baseUrl = apiUrl.replace(/\/api\/?$/, "");

        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error("Token refresh failed");
        }

        const data = await response.json();
        const newAccessToken = data.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);
        console.log("✅ Access token refreshed successfully");

        return newAccessToken;
      } catch (error) {
        console.error("❌ Failed to refresh token:", error);
        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return null;
      }
    };

    const connect = () => {
      if (!isMounted) return;

      // Get fresh token each time we connect/reconnect
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.warn("⚠️ No access token found for SSE connection");
        return;
      }

      try {
        // EventSource doesn't support custom headers, so we use query param for auth
        // Note: In production, consider using WebSocket for better security
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        // Remove trailing /api if present since we'll add the full path
        const baseUrl = apiUrl.replace(/\/api\/?$/, "");
        const urlWithAuth = `${baseUrl}/api/notifications/stream?token=${token}`;

        console.log(
          "🔌 Connecting to notification stream:",
          urlWithAuth.replace(/token=.*/, "token=***")
        );

        eventSourceWithAuth = new EventSource(urlWithAuth);

        eventSourceWithAuth.onopen = () => {
          console.log("📡 Notification stream connected successfully");
          setIsConnected(true);
        };

        eventSourceWithAuth.onmessage = (event) => {
          try {
            // Ignore heartbeat messages (they start with : and don't have data)
            if (!event.data || event.data.trim() === "") {
              return;
            }

            const notification: Notification = JSON.parse(event.data);

            console.log(
              "📬 Received notification:",
              notification.type,
              notification.title
            );

            // Skip connection message
            if (notification.type === "connected") {
              return;
            }

            if (isMounted) {
              addNotification(notification);
            }
          } catch (error) {
            console.error("❌ Failed to parse notification:", error);
          }
        };

        eventSourceWithAuth.onerror = async (error: Event) => {
          const eventSource = error.target as EventSource;

          if (eventSource.readyState === EventSource.CONNECTING) {
            console.log("🔄 Notification stream reconnecting...");
          } else if (eventSource.readyState === EventSource.CLOSED) {
            console.log(
              "🔌 Notification stream closed. Attempting reconnect..."
            );
            setIsConnected(false);
            eventSourceWithAuth?.close();

            // If we haven't tried refreshing yet, attempt token refresh
            if (!tokenRefreshed && isMounted) {
              tokenRefreshed = true;
              const newToken = await refreshAccessToken();

              if (newToken && isMounted) {
                console.log("🔄 Token refreshed, reconnecting immediately...");
                connect();
                return;
              }
            }

            // Otherwise retry connection after 5 seconds
            if (isMounted) {
              reconnectTimeout = setTimeout(() => {
                console.log(
                  "🔄 Attempting to reconnect to notification stream..."
                );
                tokenRefreshed = false; // Reset for next attempt
                connect();
              }, 5000);
            }
          } else {
            console.warn(
              "⚠️ Notification stream error (unknown state):",
              eventSource.readyState
            );
            setIsConnected(false);
          }
        };
      } catch (error) {
        console.error("❌ Failed to create EventSource:", error);
        setIsConnected(false);

        // Retry connection after 5 seconds
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            console.log("🔄 Attempting to reconnect after error...");
            connect();
          }, 5000);
        }
      }
    };

    // Initial connection
    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceWithAuth) {
        console.log("🔌 Disconnecting from notification stream");
        eventSourceWithAuth.close();
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, user, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    isConnected,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
