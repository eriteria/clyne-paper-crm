"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ResponsiveTableColumn<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
  // Hide column on mobile (for less important data)
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  // Mobile card renderer - required for mobile view
  mobileCardRenderer: (item: T, index: number) => React.ReactNode;
  // Optional: Row key extractor
  keyExtractor?: (item: T, index: number) => string | number;
  // Optional: Row click handler
  onRowClick?: (item: T) => void;
  // Optional: Empty state message
  emptyMessage?: string;
  // Optional: Loading state
  isLoading?: boolean;
  // Optional: Additional table class
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  mobileCardRenderer,
  keyExtractor = (_, index) => index,
  onRowClick,
  emptyMessage = "No data available",
  isLoading = false,
  className = "",
}: ResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
        <div className="text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const getCellContent = (item: T, column: ResponsiveTableColumn<T>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(item);
    }
    return (item[column.accessor] as React.ReactNode) ?? "-";
  };

  return (
    <>
      {/* Desktop Table View - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.headerClassName || ""
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className={`hover:bg-gray-50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 lg:px-6 py-4 text-sm text-gray-900 ${
                      column.className || ""
                    }`}
                  >
                    {getCellContent(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - visible only on mobile */}
      <div className="md:hidden space-y-4">
        {data.map((item, index) => (
          <div
            key={keyExtractor(item, index)}
            className={`bg-white border border-gray-200 rounded-lg shadow-sm ${
              onRowClick ? "cursor-pointer active:bg-gray-50" : ""
            }`}
            onClick={() => onRowClick?.(item)}
          >
            {mobileCardRenderer(item, index)}
          </div>
        ))}
      </div>
    </>
  );
}

// Expandable Mobile Card Component for complex data
interface ExpandableMobileCardProps {
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  defaultExpanded?: boolean;
}

export function ExpandableMobileCard({
  children,
  expandedContent,
  defaultExpanded = false,
}: ExpandableMobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!expandedContent) {
    return <div className="p-4">{children}</div>;
  }

  return (
    <div>
      <div className="p-4">{children}</div>
      {expandedContent && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="w-full px-4 py-2 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show more
              </>
            )}
          </button>
          {isExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              {expandedContent}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper component for mobile card rows
interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export function MobileCardRow({ label, value, icon }: MobileCardRowProps) {
  return (
    <div className="flex items-start justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{label}:</span>
      </div>
      <div className="text-sm text-gray-900 font-medium text-right">
        {value}
      </div>
    </div>
  );
}
