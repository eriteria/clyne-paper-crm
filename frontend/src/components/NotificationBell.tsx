"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotificationCenter";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    isConnected,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "progress":
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Connection indicator */}
        {isConnected && (
          <span className="absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown Panel - Responsive: full width on mobile, fixed width on desktop */}
      {isOpen && (
        <div className="fixed md:absolute inset-x-4 md:inset-x-auto md:right-0 top-20 md:top-auto md:mt-2 w-auto md:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[calc(100vh-6rem)] md:max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-500">{unreadCount} unread</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="Clear all"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  We&apos;ll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          <button
                            onClick={() => clearNotification(notification.id)}
                            className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                          >
                            <X className="w-3 h-3 text-gray-400" />
                          </button>
                        </div>

                        <p className="text-sm text-gray-600 mt-1 break-words max-w-full whitespace-pre-line">
                          {notification.message}
                        </p>

                        {/* Progress bar for progress notifications */}
                        {notification.type === "progress" &&
                          notification.data?.progress !== undefined && (
                            <div className="mt-2 max-w-full">
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-1 max-w-full">
                                <span className="truncate max-w-[70%]">
                                  Phase{" "}
                                  {(notification.data as any).phase || "?"} of{" "}
                                  {(notification.data as any).totalPhases || 5}
                                </span>
                                <span className="whitespace-nowrap">
                                  {(notification.data as any).progress}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full transition-all duration-500 ease-out"
                                  style={{
                                    width: `${
                                      (notification.data as any).progress
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                        {/* Summary for completed imports */}
                        {notification.type === "success" &&
                          (notification.data as any)?.summary && (
                            <div className="mt-2 p-2 bg-green-50 rounded text-xs space-y-1 break-words max-w-full overflow-hidden">
                              <div className="font-semibold text-green-700">
                                Import Summary:
                              </div>
                              {(notification.data as any).summary
                                .productGroups !== undefined && (
                                <div className="text-gray-700 break-words max-w-full">
                                  📦 Product Groups:{" "}
                                  {
                                    (notification.data as any).summary
                                      .productGroups
                                  }
                                </div>
                              )}
                              {(notification.data as any).summary.products !==
                                undefined && (
                                <div className="text-gray-700 break-words max-w-full">
                                  📦 Products:{" "}
                                  {(notification.data as any).summary.products}
                                </div>
                              )}
                              {(notification.data as any).summary.customers && (
                                <div className="text-gray-700 break-words max-w-full">
                                  👥 Customers:{" "}
                                  {
                                    (notification.data as any).summary.customers
                                      .created
                                  }{" "}
                                  created
                                  {(notification.data as any).summary.customers
                                    .updated > 0 &&
                                    `, ${
                                      (notification.data as any).summary
                                        .customers.updated
                                    } updated`}
                                </div>
                              )}
                              {(notification.data as any).summary.invoices !==
                                undefined && (
                                <div className="text-gray-700 break-words max-w-full">
                                  📄 Invoices:{" "}
                                  {(notification.data as any).summary.invoices}
                                </div>
                              )}
                              {(notification.data as any).summary.payments !==
                                undefined && (
                                <div className="text-gray-700 break-words max-w-full">
                                  💰 Payments:{" "}
                                  {(notification.data as any).summary.payments}
                                </div>
                              )}
                            </div>
                          )}

                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400">
                            {getTimeAgo(notification.timestamp)}
                          </span>

                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-500">
                Showing {notifications.length} notification
                {notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
