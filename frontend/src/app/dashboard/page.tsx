"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Package,
  FileText,
  MapPin,
  AlertTriangle,
  Activity,
  Plus,
} from "lucide-react";
import {
  useDashboardStats,
  useRecentInvoices,
  useRecentWaybills,
} from "@/hooks/useDashboard";
import { Invoice, Waybill } from "@/types";
import { formatCurrency } from "@/lib/utils";

// Color scheme for charts
const COLORS = ["#2563eb", "#16a34a", "#eab308", "#dc2626", "#7c3aed"];

// Interface for low stock items from API
interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  current_quantity: number;
  min_stock: number;
  location: string;
}

// Interface for overview data from API
interface Overview {
  totalInventoryValue?: number;
  inventoryValueChange?: number;
  totalInventoryItems?: number;
  lowStockCount?: number;
  totalInvoices?: number;
  pendingInvoices?: number;
  activeUsers?: number;
  totalRegions?: number;
}

export default function DashboardPage() {
  const { data: dashboardData, isLoading, error } = useDashboardStats();
  const { data: recentInvoices, isLoading: invoicesLoading } =
    useRecentInvoices();
  const { data: recentWaybills, isLoading: waybillsLoading } =
    useRecentWaybills();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowQuickActions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const overview: Overview = dashboardData?.data?.overview || {};
  const teams = dashboardData?.data?.teams || [];
  const lowStockItems = dashboardData?.data?.lowStockItems || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Clyne Paper CRM</p>
        </div>
        <div className="flex gap-3 relative">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Quick Action
            </button>

            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-2">
                  <button
                    onClick={() => {
                      router.push("/invoices");
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-800 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    Create Invoice
                  </button>
                  <button
                    onClick={() => {
                      router.push("/inventory");
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-800 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2 transition-colors"
                  >
                    <Package className="h-4 w-4 text-gray-600" />
                    Add Inventory
                  </button>
                  <button
                    onClick={() => {
                      router.push("/users");
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-800 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2 transition-colors"
                  >
                    <Users className="h-4 w-4 text-gray-600" />
                    Manage Users
                  </button>
                  <button
                    onClick={() => {
                      router.push("/reports");
                      setShowQuickActions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-800 hover:bg-gray-100 hover:text-gray-900 flex items-center gap-2 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4 text-gray-600" />
                    View Reports
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => router.push("/inventory")}
          className="cursor-pointer"
        >
          <KPICard
            icon={<span className="text-2xl font-bold text-green-600">₦</span>}
            label="Total Inventory Value"
            value={formatCurrency(overview.totalInventoryValue || 0)}
            change={
              overview.inventoryValueChange !== undefined
                ? `${overview.inventoryValueChange >= 0 ? "+" : ""}${overview.inventoryValueChange.toFixed(1)}%`
                : undefined
            }
            changeType={
              overview.inventoryValueChange !== undefined
                ? overview.inventoryValueChange >= 0
                  ? "positive"
                  : "negative"
                : undefined
            }
          />
        </div>
        <div
          onClick={() => router.push("/inventory")}
          className="cursor-pointer"
        >
          <KPICard
            icon={<Package className="h-6 w-6 text-blue-600" />}
            label="Inventory Items"
            value={`${overview.totalInventoryItems || 0}`}
            subtext={`${overview.lowStockCount || 0} low stock`}
          />
        </div>
        <div
          onClick={() => router.push("/invoices")}
          className="cursor-pointer"
        >
          <KPICard
            icon={<FileText className="h-6 w-6 text-yellow-600" />}
            label="Total Invoices"
            value={`${overview.totalInvoices || 0}`}
            subtext={`${overview.pendingInvoices || 0} pending`}
          />
        </div>
        <div onClick={() => router.push("/users")} className="cursor-pointer">
          <KPICard
            icon={<Users className="h-6 w-6 text-purple-600" />}
            label="Active Users"
            value={`${overview.activeUsers || 0}`}
            subtext={`${overview.totalRegions || 0} regions`}
          />
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Teams Distribution */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Teams by Region
          </h2>
          {teams.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={teams}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="memberCount"
                  label={({ name, memberCount }: { name: string; memberCount: number }) => `${name}: ${memberCount}`}
                >
                  {teams.map((entry: unknown, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">No team data available</p>
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Low Stock Alert
          </h2>
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems
                .slice(0, 5)
                .map((item: LowStockItem, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-600">
                        Location: {item.location}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">
                        {item.current_quantity}/{item.min_stock}
                      </p>
                      <p className="text-xs text-gray-500">Current/Min</p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-500">
                  All inventory levels are healthy
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Waybills */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Waybills
          </h3>
          <div className="space-y-3">
            {waybillsLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : recentWaybills?.waybills?.length > 0 ? (
              recentWaybills.waybills
                .slice(0, 3)
                .map((waybill: Waybill, index: number) => (
                  <ActivityItem
                    key={waybill.id || index}
                    icon={<Package className="h-4 w-4 text-green-600" />}
                    title={`Waybill #${waybill.waybillNumber}`}
                    subtitle={`${waybill.supplier} • ${
                      waybill.items?.length || 0
                    } items`}
                    time={new Date(waybill.createdAt).toLocaleDateString()}
                  />
                ))
            ) : (
              <div className="text-gray-500 text-sm">No recent waybills</div>
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Invoices
          </h3>
          <div className="space-y-3">
            {invoicesLoading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : recentInvoices?.data?.length > 0 ? (
              recentInvoices.data
                .slice(0, 3)
                .map((invoice: Invoice, index: number) => (
                  <ActivityItem
                    key={invoice.id || index}
                    icon={<FileText className="h-4 w-4 text-yellow-600" />}
                    title={`Invoice #${invoice.invoiceNumber}`}
                    subtitle={`₦ ${
                      invoice.totalAmount?.toLocaleString() || 0
                    } • ${invoice.customerName || "Unknown Customer"}`}
                    time={new Date(invoice.createdAt).toLocaleDateString()}
                  />
                ))
            ) : (
              <div className="text-gray-500 text-sm">No recent invoices</div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionButton
              label="Create Invoice"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => router.push("/invoices")}
            />
            <QuickActionButton
              label="Add Waybill"
              icon={<Package className="h-4 w-4" />}
              onClick={() => router.push("/waybills")}
            />
            <QuickActionButton
              label="View Reports"
              icon={<TrendingUp className="h-4 w-4" />}
              onClick={() => router.push("/reports")}
            />
            <QuickActionButton
              label="Manage Users"
              icon={<Users className="h-4 w-4" />}
              onClick={() => router.push("/users")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  change,
  changeType,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  subtext?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 rounded-full p-3">{icon}</div>
          <div>
            <p className="text-sm text-gray-600 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
            {change && (
              <p
                className={`text-sm mt-1 ${
                  changeType === "positive" ? "text-green-600" : "text-red-600"
                }`}
              >
                {change}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  icon,
  title,
  subtitle,
  time,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="bg-gray-100 rounded-full p-2">{icon}</div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
  );
}

function QuickActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-3"
    >
      {icon}
      {label}
    </button>
  );
}
