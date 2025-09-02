"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useSidebar } from "@/hooks/useSidebar";

export default function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ${
            isCollapsed ? "ml-16" : "ml-64"
          }`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
