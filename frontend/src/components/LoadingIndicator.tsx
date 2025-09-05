"use client";

import { useLoading } from "@/hooks/useLoading";
import { Loader2 } from "lucide-react";

export default function LoadingIndicator() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 flex items-center space-x-3 max-w-sm mx-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <span className="text-gray-700 dark:text-gray-300 font-medium">
          {loadingMessage || "Loading..."}
        </span>
      </div>
    </div>
  );
}
