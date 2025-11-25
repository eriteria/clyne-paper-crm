"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useSidebar } from "@/hooks/useSidebar";

export default function PreferencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden bg-gray-100 w-full">
        <Sidebar />
        <div
          className={`flex-1 flex flex-col transition-all duration-300 bg-gray-50 min-w-0 w-full max-w-full
            ${isCollapsed ? "md:ml-16" : "md:ml-64"}
          `}
        >
          <DashboardHeader />
          <main className="flex-1 overflow-auto p-6 w-full">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
