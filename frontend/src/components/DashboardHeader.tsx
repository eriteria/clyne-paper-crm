"use client";

import React from "react";
import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";

export function DashboardHeader() {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebar();

  const handleMenuClick = () => {
    console.log("Hamburger clicked, opening mobile menu");
    setMobileOpen(true);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      {/* Mobile hamburger menu button */}
      <button
        onClick={handleMenuClick}
        className="md:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>

      {/* User info */}
      <div className="flex-1 md:flex-initial">
        <h2 className="text-base md:text-lg font-semibold text-gray-800">
          {user?.fullName || "User"}
        </h2>
        <p className="text-xs md:text-sm text-gray-500 hidden sm:block">
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
