"use client";

import React from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

export function DashboardHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-800">
          {user?.fullName || "User"}
        </h2>
        <p className="text-sm text-gray-500">
          {(user?.role as any)?.name || user?.role || "Role"}
        </p>
      </div>

      {/* Notification Bell */}
      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  );
}
