"use client";

import { useState, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  Download,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  FileText,
  Filter,
  RefreshCw,
  BarChart3,
  Target,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import {
  exportReport,
  getOverdueInvoices,
  getSalesReport,
  getARAging,
  getCustomerReport,
  runDynamicReport,
  dynamicReportTemplates,
  type DynamicReportRequest,
  type DynamicReportResponse,
} from "@/lib/reports-api";
import type {
  OverdueInvoice,
  ARAgingReport,
  ARAgingCustomer,
  CustomerReport,
} from "@/types/reports";
import type { SalesReport } from "@/types/reports";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";

// Utility Functions
const formatCurrency = (amount: number) => {
  // Handle invalid numbers
  if (isNaN(amount) || !isFinite(amount)) {
    return "₦0.00";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

// Metric Card Component
interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  value: string;
  change: string;
  changeColor: string;
}

function MetricCard({
  icon: Icon,
  iconColor,
  title,
  value,
  change,
  changeColor,
}: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className={`text-sm ${changeColor}`}>{change}</p>
        </div>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </div>
    </div>
  );
}

// Sales Performance Tab
interface SalesTabProps {
  data?: SalesReport;
  isLoading: boolean;
}

function SalesTab({ data, isLoading }: SalesTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading sales performance...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 h-64 flex items-center justify-center">
        No sales data available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={DollarSign}
          iconColor="text-green-600"
          title="Total Sales"
          value={formatCurrency(data.summary.totalSales)}
          change={`Invoices: ${formatNumber(data.summary.totalInvoices)}`}
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={FileText}
          iconColor="text-blue-600"
          title="Average Sale"
          value={formatCurrency(data.summary.averageSale)}
          change="Per Invoice"
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={TrendingUp}
          iconColor="text-orange-600"
          title="Top Relationship Manager"
          value={data.topPerformers[0]?.fullName || "-"}
          change={`₦${formatNumber(
            data.topPerformers[0]?.totalSales || 0
          )} sales`}
          changeColor="text-green-600"
        />
      </div>

      {/* Sales Over Time Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sales Trend Over Time
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data.salesOverTime || []}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#6B7280" }}
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(value), "Total Sales"]}
              labelFormatter={(label) => {
                const date = new Date(label);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              }}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "12px",
              }}
            />
            <Line
              type="monotone"
              dataKey="totalAmount"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: "#3B82F6", r: 5 }}
              activeDot={{ r: 7, fill: "#2563EB" }}
              name="Total Sales"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Contribution Chart */}
      {data.customerContribution && data.customerContribution.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Customer Contribution to Sales
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Top 6 customers contributing to total sales over time
            </p>
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <AreaChart
              data={data.customerContribution}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <defs>
                {data.topCustomers?.slice(0, 6).map((customer, index) => {
                  const colors = [
                    ["#3B82F6", "#1E40AF"], // Blue
                    ["#10B981", "#047857"], // Green
                    ["#F59E0B", "#B45309"], // Amber
                    ["#EF4444", "#B91C1C"], // Red
                    ["#8B5CF6", "#6D28D9"], // Purple
                    ["#EC4899", "#BE185D"], // Pink
                  ];
                  const [startColor, endColor] = colors[index % colors.length];
                  return (
                    <linearGradient
                      key={customer.customerId}
                      id={`color${customer.customerId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={startColor}
                        stopOpacity={0.9}
                      />
                      <stop
                        offset="95%"
                        stopColor={endColor}
                        stopOpacity={0.4}
                      />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                angle={0}
                height={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B7280" }}
                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
                width={70}
              />
              <Tooltip
                formatter={(value: any, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  padding: "12px",
                  maxHeight: "250px",
                  overflowY: "auto",
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "30px",
                  fontSize: "12px",
                  lineHeight: "24px",
                }}
                iconType="rect"
                iconSize={14}
                formatter={(value) => {
                  // Truncate long names
                  return value.length > 25
                    ? value.substring(0, 25) + "..."
                    : value;
                }}
              />
              {data.topCustomers?.slice(0, 6).map((customer, index) => {
                const colors = [
                  "#3B82F6",
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#EC4899",
                ];
                return (
                  <Area
                    key={customer.customerId}
                    type="monotone"
                    dataKey={customer.customerName}
                    stackId="1"
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    fill={`url(#color${customer.customerId})`}
                    name={customer.customerName}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Performers Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Sales Performers (by Relationship Manager)
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Relationship Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topPerformers.map((user) => (
                <tr key={user.userId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.teamName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(user.invoiceCount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(user.totalSales)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Overdue Invoices Tab
interface OverdueTabProps {
  data?: OverdueInvoice[];
  isLoading: boolean;
}

function OverdueTab({ data, isLoading }: OverdueTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading overdue invoices...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 h-64 flex items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Overdue Invoices
          </h3>
          <p className="text-gray-500">
            Great! All invoices are paid or current.
          </p>
        </div>
      </div>
    );
  }

  // Calculate summary metrics
  const totalOverdueAmount = data.reduce((sum, invoice) => {
    const balance = Number(invoice.balance);
    return sum + (isNaN(balance) || !isFinite(balance) ? 0 : balance);
  }, 0);
  const averageDaysOverdue = Math.round(
    data.reduce((sum, invoice) => sum + invoice.daysOverdue, 0) / data.length
  );

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          icon={Target}
          iconColor="text-red-600"
          title="Overdue Invoices"
          value={formatNumber(data.length)}
          change="Total count"
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={DollarSign}
          iconColor="text-red-600"
          title="Total Amount"
          value={formatCurrency(totalOverdueAmount)}
          change="Outstanding balance"
          changeColor="text-red-600"
        />
        <MetricCard
          icon={FileText}
          iconColor="text-orange-600"
          title="Average Days"
          value={formatNumber(averageDaysOverdue)}
          change="Days overdue"
          changeColor="text-orange-600"
        />
      </div>

      {/* Overdue Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Overdue Invoices ({data.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Invoices past their due date requiring immediate attention
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Days Overdue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.team || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.billedBy || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(invoice.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.daysOverdue > 90
                          ? "bg-red-100 text-red-800"
                          : invoice.daysOverdue > 60
                          ? "bg-red-50 text-red-700"
                          : invoice.daysOverdue > 30
                          ? "bg-orange-100 text-orange-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invoice.daysOverdue} days
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invoice.status === "overdue"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// AR Aging Tab
function AgingTab({
  data,
  isLoading,
}: {
  data?: ARAgingReport;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        Loading A/R aging...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 h-64 flex items-center justify-center">
        No receivables data
      </div>
    );
  }

  const buckets = [
    { key: "current", label: "Current" },
    { key: "d1_30", label: "1–30" },
    { key: "d31_60", label: "31–60" },
    { key: "d61_90", label: "61–90" },
    { key: "d90_plus", label: "90+" },
  ] as const;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0);

  return (
    <div className="space-y-8">
      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard
          icon={DollarSign}
          iconColor="text-gray-700"
          title="Current"
          value={formatCurrency(data.totals.current)}
          change=""
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={DollarSign}
          iconColor="text-yellow-700"
          title="1–30"
          value={formatCurrency(data.totals.d1_30)}
          change=""
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={DollarSign}
          iconColor="text-orange-700"
          title="31–60"
          value={formatCurrency(data.totals.d31_60)}
          change=""
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={DollarSign}
          iconColor="text-red-700"
          title="61–90"
          value={formatCurrency(data.totals.d61_90)}
          change=""
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={DollarSign}
          iconColor="text-red-800"
          title="90+"
          value={formatCurrency(data.totals.d90_plus)}
          change=""
          changeColor="text-gray-500"
        />
      </div>

      {/* Per-customer table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            A/R Aging by Customer
          </h3>
          <div className="text-sm text-gray-600">
            As of {new Date(data.asOf).toLocaleDateString()}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide w-10"></th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Customer
                </th>
                {buckets.map((b) => (
                  <th
                    key={b.key}
                    className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    {b.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.customers.map((c: ARAgingCustomer, idx: number) => (
                <Fragment key={c.customerId}>
                  <tr
                    className={`hover:bg-gray-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => toggle(c.customerId)}
                        className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-gray-200"
                        aria-label={
                          expanded[c.customerId] ? "Collapse" : "Expand"
                        }
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expanded[c.customerId] ? "rotate-180" : "rotate-0"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.customerName || c.customerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(c.current)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(c.d1_30)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(c.d31_60)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(c.d61_90)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {formatCurrency(c.d90_plus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(c.total)}
                    </td>
                  </tr>
                  {expanded[c.customerId] &&
                    c.invoices &&
                    c.invoices.length > 0 && (
                      <tr
                        className={`${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td colSpan={8} className="px-6 pb-4">
                          <div className="rounded-md border border-gray-200">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                              Invoices ({c.invoices.length})
                            </div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="text-left text-xs text-gray-600">
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Due</th>
                                    <th className="px-4 py-2 text-right">
                                      Balance
                                    </th>
                                    <th className="px-4 py-2 text-right">
                                      Days
                                    </th>
                                    <th className="px-4 py-2 text-right">
                                      Bucket
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.invoices.map((inv) => (
                                    <tr
                                      key={inv.id}
                                      className="text-sm text-gray-800"
                                    >
                                      <td className="px-4 py-2">
                                        {format(
                                          new Date(inv.date),
                                          "MMM dd, yyyy"
                                        )}
                                      </td>
                                      <td className="px-4 py-2">
                                        {inv.dueDate
                                          ? format(
                                              new Date(inv.dueDate),
                                              "MMM dd, yyyy"
                                            )
                                          : "-"}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatCurrency(inv.balance)}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {inv.daysPastDueOrOutstanding}
                                      </td>
                                      <td className="px-4 py-2 text-right uppercase">
                                        {inv.bucket.replace("_", "-")}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 text-left text-sm font-semibold text-gray-800 uppercase">
                  Grand Total
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.totals.current)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.totals.d1_30)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.totals.d31_60)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.totals.d61_90)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  {formatCurrency(data.totals.d90_plus)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(data.totals.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// Customers Report Tab
interface CustomersTabProps {
  data?: CustomerReport;
  isLoading: boolean;
}

function CustomersTab({ data, isLoading }: CustomersTabProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 h-64 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Customer Data
          </h3>
          <p className="text-gray-500">
            Unable to load customer analytics for the selected period.
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const acquisitionChartData = data.acquisition.map((item) => ({
    month: format(new Date(item.month), "MMM yyyy"),
    customers: Number(item.new_customers || 0),
  }));

  const segmentationChartData = data.segmentation.map((item) => ({
    name: item.segment,
    value: Number(item.customer_count || 0),
    revenue: Number(item.segment_revenue || 0),
  }));

  const paymentBehaviorData = data.paymentBehavior.map((item) => ({
    name: item.payment_type,
    value: Number(item.customer_count || 0),
    avgDays: Number(item.avg_payment_days || 0),
  }));

  return (
    <div className="space-y-8">
      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          iconColor="text-blue-600"
          title="Total Customers"
          value={formatNumber(data.overview.totalCustomers)}
          change={`${data.overview.activeCustomers} active`}
          changeColor="text-green-600"
        />
        <MetricCard
          icon={TrendingUp}
          iconColor="text-green-600"
          title="New Customers"
          value={formatNumber(data.overview.newCustomers)}
          change={`${
            data.overview.customerGrowthRate >= 0 ? "+" : ""
          }${data.overview.customerGrowthRate.toFixed(1)}% vs previous`}
          changeColor={
            data.overview.customerGrowthRate >= 0
              ? "text-green-600"
              : "text-red-600"
          }
        />
        <MetricCard
          icon={Target}
          iconColor="text-purple-600"
          title="Retention Rate"
          value={`${data.overview.retentionRate.toFixed(1)}%`}
          change="Customer retention"
          changeColor="text-gray-500"
        />
        <MetricCard
          icon={AlertTriangle}
          iconColor="text-orange-600"
          title="At Risk"
          value={formatNumber(data.overview.atRiskCustomers)}
          change="No recent orders"
          changeColor="text-orange-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Customer Acquisition Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Acquisition Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="customers" fill="#3B82F6" name="New Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Segmentation */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Segmentation by Value
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={segmentationChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name}: ${value}`
                  }
                >
                  {segmentationChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#2563eb", "#16a34a", "#eab308", "#dc2626"][index % 4]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Behavior Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Behavior Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentBehaviorData.map((item) => (
            <div key={item.name} className="text-center p-4 border rounded-lg">
              <div
                className={`text-2xl font-bold ${
                  item.name === "Fast Payers"
                    ? "text-green-600"
                    : item.name === "Regular Payers"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {formatNumber(item.value)}
              </div>
              <div className="text-sm text-gray-600">{item.name}</div>
              <div className="text-xs text-gray-500">
                Avg: {item.avgDays.toFixed(1)} days
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Top Customers by Revenue
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Highest revenue generating customers in the selected period
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Purchase
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.topCustomers.slice(0, 15).map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {customer.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.location || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {customer.email || "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {customer.phone || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(customer.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatNumber(customer.invoiceCount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {formatCurrency(customer.avgOrderValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.lastPurchase
                      ? format(new Date(customer.lastPurchase), "MMM dd, yyyy")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Distribution */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Customer Distribution by Location
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.locationDistribution.map((location) => (
            <div key={location.location_id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {location.location_name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatNumber(location.customer_count)} customers
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(Number(location.location_revenue || 0))}
                  </div>
                  <div className="text-xs text-gray-500">Revenue</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Custom Reports Tab (using dynamic reports endpoint)
interface CustomReportsTabProps {
  startDate: string;
  endDate: string;
}

function CustomReportsTab({ startDate, endDate }: CustomReportsTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customModel, setCustomModel] = useState("invoice");
  const [groupByField, setGroupByField] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<string[]>([
    "count",
    "sum:totalAmount",
  ]);

  const {
    mutate: runReport,
    data,
    isLoading,
    error,
  } = useMutation({
    mutationFn: async (request: DynamicReportRequest) => {
      return await runDynamicReport(request);
    },
  });

  // Quick report templates
  const quickReports = [
    {
      id: "revenueByLocation",
      name: "Revenue by Region",
      icon: Target,
      description: "Sales breakdown by region",
    },
    {
      id: "revenueByTeam",
      name: "Revenue by Team",
      icon: Users,
      description: "Team performance comparison",
    },
    {
      id: "topCustomers",
      name: "Top Customers",
      icon: TrendingUp,
      description: "Highest revenue customers",
    },
    {
      id: "paymentMethodAnalysis",
      name: "Payment Methods",
      icon: DollarSign,
      description: "Payment method distribution",
    },
    {
      id: "invoiceStatusSummary",
      name: "Invoice Status",
      icon: FileText,
      description: "Invoice status breakdown",
    },
    {
      id: "totalRevenueSummary",
      name: "Total Revenue",
      icon: BarChart3,
      description: "Actual payments summary",
    },
    {
      id: "productSalesAnalysis",
      name: "Product Sales",
      icon: Package,
      description: "Top selling products",
    },
    {
      id: "salesByUser",
      name: "Sales by User",
      icon: Users,
      description: "Individual performance",
    },
  ];

  const handleQuickReport = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = (dynamicReportTemplates as any)[templateId];
    if (template) {
      const request = template(startDate, endDate);
      runReport(request);
    }
  };

  const handleCustomReport = () => {
    const request: DynamicReportRequest = {
      model: customModel,
      filters: {
        startDate,
        endDate,
        statuses: filterStatus.length > 0 ? filterStatus : undefined,
      },
      groupBy: groupByField ? [groupByField] : undefined,
      aggregations,
      limit: 100,
    };
    runReport(request);
  };

  const toggleAggregation = (agg: string) => {
    if (aggregations.includes(agg)) {
      setAggregations(aggregations.filter((a) => a !== agg));
    } else {
      setAggregations([...aggregations, agg]);
    }
  };

  const toggleStatus = (status: string) => {
    if (filterStatus.includes(status)) {
      setFilterStatus(filterStatus.filter((s) => s !== status));
    } else {
      setFilterStatus([...filterStatus, status]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Reports */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Quick Reports</h2>
          <p className="text-sm text-gray-600 mt-1">
            Pre-configured reports for common insights. Click any card to
            generate instantly.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => (
            <button
              key={report.id}
              onClick={() => handleQuickReport(report.id)}
              disabled={isLoading}
              className={`group p-5 border-2 rounded-xl text-left transition-all hover:shadow-lg ${
                selectedTemplate === report.id
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-400"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedTemplate === report.id
                      ? "bg-blue-100"
                      : "bg-gray-100 group-hover:bg-blue-100"
                  }`}
                >
                  <report.icon
                    className={`h-6 w-6 ${
                      selectedTemplate === report.id
                        ? "text-blue-600"
                        : "text-gray-600 group-hover:text-blue-600"
                    }`}
                  />
                </div>
                {isLoading && selectedTemplate === report.id && (
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                )}
              </div>
              <div className="font-semibold text-gray-900 mb-1">
                {report.name}
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                {report.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Build Your Own Report
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Customize filters and metrics to create exactly the report you need
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Model Selection */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📊 What data do you want to analyze?
            </label>
            <select
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white rounded-lg px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="invoice">💰 Invoices & Sales</option>
              <option value="customerPayment">💳 Payments Received</option>
              <option value="customer">👥 Customers</option>
              <option value="inventoryItem">📦 Inventory & Stock</option>
              <option value="waybill">🚚 Waybills & Deliveries</option>
              <option value="invoiceItem">📝 Invoice Line Items</option>
            </select>
          </div>

          {/* Group By */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📂 How do you want to break it down?
            </label>
            <select
              value={groupByField}
              onChange={(e) => setGroupByField(e.target.value)}
              className="w-full border-2 border-gray-300 bg-white rounded-lg px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            >
              <option value="">📊 Summary Total (No Grouping)</option>
              <option value="status">📌 By Status</option>
              <option value="customerId">👤 By Customer ID</option>
              <option value="customerName">👥 By Customer Name</option>
              <option value="teamId">🏢 By Team</option>
              <option value="regionId">�️ By Region</option>
              <option value="paymentMethod">💳 By Payment Method</option>
              <option value="billedByUserId">👨‍💼 By Sales Person</option>
            </select>
          </div>

          {/* Aggregations */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              📈 What metrics do you want to see?
            </label>
            <div className="space-y-2 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200">
              {[
                { value: "count", label: "📊 Count (Number of Records)" },
                { value: "sum:totalAmount", label: "💰 Total Amount (Sum)" },
                { value: "avg:totalAmount", label: "📊 Average Amount" },
                { value: "sum:amount", label: "💵 Total Paid (Sum)" },
                { value: "avg:amount", label: "📊 Average Paid" },
                { value: "min:amount", label: "📉 Minimum Amount" },
                { value: "max:amount", label: "📈 Maximum Amount" },
              ].map((agg) => (
                <label
                  key={agg.value}
                  className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={aggregations.includes(agg.value)}
                    onChange={() => toggleAggregation(agg.value)}
                    className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900 font-medium">
                    {agg.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filters (for invoice/payment models) */}
          {(customModel === "invoice" || customModel === "customerPayment") && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                🔍 Filter by Status
              </label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto border border-gray-200">
                {(customModel === "invoice"
                  ? [
                      { value: "PAID", label: "✅ Paid", color: "green" },
                      {
                        value: "PARTIALLY_PAID",
                        label: "🟡 Partially Paid",
                        color: "yellow",
                      },
                      { value: "OPEN", label: "📂 Open", color: "blue" },
                      {
                        value: "PARTIAL",
                        label: "🟠 Partial",
                        color: "orange",
                      },
                      {
                        value: "CANCELLED",
                        label: "❌ Cancelled",
                        color: "red",
                      },
                    ]
                  : [
                      {
                        value: "COMPLETED",
                        label: "✅ Completed",
                        color: "green",
                      },
                      {
                        value: "PENDING",
                        label: "⏳ Pending",
                        color: "yellow",
                      },
                      { value: "FAILED", label: "❌ Failed", color: "red" },
                    ]
                ).map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center p-2 hover:bg-white rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filterStatus.includes(status.value)}
                      onChange={() => toggleStatus(status.value)}
                      className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900 font-medium">
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {aggregations.length === 0 && (
              <span className="text-amber-600 font-medium">
                ⚠️ Please select at least one metric
              </span>
            )}
            {aggregations.length > 0 && (
              <span className="text-green-600 font-medium">
                ✓ Ready to generate report
              </span>
            )}
          </p>
          <button
            onClick={handleCustomReport}
            disabled={isLoading || aggregations.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-xl transition-all"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <BarChart3 className="h-5 w-5 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold">
                Error Running Report
              </h3>
              <p className="text-red-700 text-sm mt-1">
                {(error as any).message || "An unexpected error occurred"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {data && (
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200">
          <div className="px-6 py-5 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
                  Report Results
                </h2>
                <p className="text-sm text-gray-600 mt-2">
                  {data.queryType === "groupBy"
                    ? `📊 Showing ${data.resultCount || 0} ${
                        data.resultCount === 1 ? "group" : "groups"
                      }`
                    : `📈 Summary totals`}
                  {" • "}
                  {data.model === "invoice" && "💰 Invoices"}
                  {data.model === "customerPayment" && "💳 Payments"}
                  {data.model === "customer" && "👥 Customers"}
                  {data.model === "inventoryItem" && "📦 Inventory"}
                </p>
              </div>
              <button
                onClick={() => {
                  const dataStr = JSON.stringify(data, null, 2);
                  const blob = new Blob([dataStr], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `report-${new Date().toISOString()}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center px-5 py-2.5 text-sm font-medium border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* GroupBy Results */}
            {data.queryType === "groupBy" &&
              data.data &&
              data.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                      <tr>
                        {Object.keys(data.data[0]).map((key) => {
                          // Make headers more readable and human-friendly
                          let friendlyLabel = key
                            .replace(/([A-Z])/g, " $1")
                            .replace(/_/g, " ")
                            .replace(/^./, (str) => str.toUpperCase())
                            .trim();

                          // Special handling for common aggregation labels
                          if (key === "_count") friendlyLabel = "Count";
                          if (key === "_sum") friendlyLabel = "Total";
                          if (key === "_avg") friendlyLabel = "Average";
                          if (key === "_min") friendlyLabel = "Minimum";
                          if (key === "_max") friendlyLabel = "Maximum";

                          // Improve specific field names
                          if (key === "customerName")
                            friendlyLabel = "Customer";
                          if (key === "teamName") friendlyLabel = "Team";
                          if (key === "regionName") friendlyLabel = "Region";
                          if (key === "locationName")
                            friendlyLabel = "Location";
                          if (key === "productName") friendlyLabel = "Product";
                          if (key === "salesPerson")
                            friendlyLabel = "Sales Person";
                          if (key === "paymentMethod")
                            friendlyLabel = "Payment Method";

                          return (
                            <th
                              key={key}
                              className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase tracking-wide"
                            >
                              {friendlyLabel}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.data.map(
                        (row: Record<string, unknown>, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-blue-50 transition-colors"
                          >
                            {Object.entries(row).map(
                              ([key, value]: [string, unknown], cellIdx) => {
                                // Determine if this column contains amounts/currency
                                const isAmountColumn =
                                  key.toLowerCase().includes("amount") ||
                                  key.toLowerCase().includes("total") ||
                                  key.toLowerCase().includes("revenue") ||
                                  key.toLowerCase().includes("price");

                                return (
                                  <td
                                    key={cellIdx}
                                    className="px-6 py-4 text-sm"
                                  >
                                    {typeof value === "object" &&
                                    value !== null ? (
                                      // For nested objects (aggregations like _sum, _avg)
                                      <div className="space-y-1">
                                        {Object.entries(
                                          value as Record<string, unknown>
                                        ).map(([k, v]) => {
                                          const isAmount =
                                            k
                                              .toLowerCase()
                                              .includes("amount") ||
                                            k.toLowerCase().includes("total") ||
                                            k
                                              .toLowerCase()
                                              .includes("revenue") ||
                                            k.toLowerCase().includes("price") ||
                                            k.toLowerCase().includes("balance");

                                          // Convert to number if it's a numeric string (Prisma Decimal)
                                          const numValue =
                                            typeof v === "string" &&
                                            !isNaN(Number(v))
                                              ? Number(v)
                                              : typeof v === "number"
                                              ? v
                                              : null;

                                          return (
                                            <div
                                              key={k}
                                              className="font-semibold text-gray-900"
                                            >
                                              {numValue !== null
                                                ? isAmount
                                                  ? formatCurrency(numValue)
                                                  : formatNumber(numValue)
                                                : String(v)}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : typeof value === "number" ? (
                                      <span className="font-semibold text-gray-900">
                                        {isAmountColumn
                                          ? formatCurrency(value)
                                          : formatNumber(value)}
                                      </span>
                                    ) : typeof value === "string" &&
                                      !isNaN(Number(value)) &&
                                      value.trim() !== "" ? (
                                      // Handle numeric strings (Prisma Decimal values)
                                      <span className="font-semibold text-gray-900">
                                        {isAmountColumn
                                          ? formatCurrency(Number(value))
                                          : formatNumber(Number(value))}
                                      </span>
                                    ) : (
                                      <span className="text-gray-900">
                                        {String(value)}
                                      </span>
                                    )}
                                  </td>
                                );
                              }
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            {/* Aggregate Results */}
            {data.queryType === "aggregate" && data.aggregation && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.entries(data.aggregation).map(
                  ([key, value]: [string, unknown]) => {
                    // Make labels more friendly
                    const friendlyLabel = key
                      .replace(/_/g, " ")
                      .replace(/^./, (str) => str.toUpperCase());

                    const icons: Record<string, string> = {
                      _count: "📊",
                      _sum: "💰",
                      _avg: "📈",
                      _min: "📉",
                      _max: "📈",
                    };

                    const icon = icons[key] || "📊";

                    return (
                      <div
                        key={key}
                        className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-md hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                            {friendlyLabel}
                          </div>
                          <span className="text-2xl">{icon}</span>
                        </div>
                        {typeof value === "object" && value !== null ? (
                          <div className="space-y-2">
                            {Object.entries(
                              value as Record<string, unknown>
                            ).map(([k, v]) => {
                              const isAmount =
                                k.toLowerCase().includes("amount") ||
                                k.toLowerCase().includes("total");
                              const friendlyKey = k
                                .replace(/([A-Z])/g, " $1")
                                .replace(/_/g, " ")
                                .trim()
                                .replace(/^./, (str) => str.toUpperCase());

                              return (
                                <div
                                  key={k}
                                  className="bg-white rounded-lg p-3 border border-blue-200"
                                >
                                  <div className="text-xs font-semibold text-gray-600 mb-1">
                                    {friendlyKey}
                                  </div>
                                  <div className="text-2xl font-bold text-gray-900">
                                    {typeof v === "number"
                                      ? isAmount
                                        ? formatCurrency(v)
                                        : formatNumber(v)
                                      : String(v)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-3xl font-bold text-gray-900 mt-2">
                            {typeof value === "number"
                              ? formatNumber(value)
                              : String(value)}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* No Results */}
            {((data.queryType === "groupBy" &&
              (!data.data || data.data.length === 0)) ||
              (data.queryType === "aggregate" && !data.aggregation)) && (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <BarChart3 className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Data Found
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  No data matches your selected criteria. Try adjusting the date
                  range or filters.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!data && !isLoading && !error && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 shadow-md">
          <div className="flex items-start">
            <div className="bg-blue-100 rounded-full p-3 mr-4 flex-shrink-0">
              <Target className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                💡 Getting Started with Custom Reports
              </h3>
              <p className="text-gray-700 mb-4">
                Generate any report you need in seconds! Choose from quick
                templates or build your own custom analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    ⚡ Quick Reports
                  </h4>
                  <p className="text-sm text-gray-600">
                    Click any card above for instant insights. Perfect for
                    common questions like "Revenue by location" or "Top
                    customers".
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    🎨 Custom Builder
                  </h4>
                  <p className="text-sm text-gray-600">
                    Create exactly what you need. Pick your data source, choose
                    how to group it, and select the metrics to calculate.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    📅 Date Filters
                  </h4>
                  <p className="text-sm text-gray-600">
                    Use the date range selector at the top of the page to focus
                    on specific time periods.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    💾 Export Results
                  </h4>
                  <p className="text-sm text-gray-600">
                    Download your report data as JSON for further analysis in
                    Excel or other tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: "2000-01-01",
    endDate: new Date().toISOString().split("T")[0],
  });

  const [activeTab, setActiveTab] = useState("custom");

  // Data queries
  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ["overdue-invoices"],
    queryFn: () => getOverdueInvoices(),
  });

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-report", filters],
    queryFn: () => getSalesReport(filters.startDate, filters.endDate),
  });

  // AR Aging query (as-of uses filters.endDate to align with date pickers)
  const [agingMode, setAgingMode] = useState<"due" | "outstanding">("due");
  const [agingNetDays, setAgingNetDays] = useState<number>(30);
  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["ar-aging", filters.endDate, agingMode, agingNetDays],
    queryFn: () => getARAging(filters.endDate, agingMode, agingNetDays),
  });

  // Customer Report query
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["customer-report", filters],
    queryFn: () => getCustomerReport(filters.startDate, filters.endDate),
  });

  const tabs = [
    { id: "custom", name: "Custom Reports", icon: BarChart3 },
    { id: "sales", name: "Sales Performance", icon: TrendingUp },
    { id: "overdue", name: "Overdue Invoices", icon: Target },
    { id: "aging", name: "A/R Aging", icon: FileText },
    { id: "customers", name: "Customers", icon: Users },
    { id: "inventory", name: "Inventory", icon: Package },
  ];

  const handleExport = async () => {
    try {
      await exportReport({
        reportType: activeTab,
        format: "csv",
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reports Dashboard
          </h1>
          <p className="text-gray-500">Business insights and analytics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {activeTab === "aging" && (
              <>
                <select
                  value={agingMode}
                  onChange={(e) =>
                    setAgingMode(e.target.value as "due" | "outstanding")
                  }
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="due">Due (days past due)</option>
                  <option value="outstanding">
                    Outstanding (since invoice date)
                  </option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={agingNetDays}
                  onChange={(e) =>
                    setAgingNetDays(parseInt(e.target.value || "0", 10))
                  }
                  className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  title="Net days for missing due dates"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {/* Custom Reports (Dynamic) */}
        {activeTab === "custom" && (
          <CustomReportsTab
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        )}

        {/* Sales Performance */}
        {activeTab === "sales" && (
          <SalesTab data={salesData} isLoading={salesLoading} />
        )}

        {/* Overdue Invoices */}
        {activeTab === "overdue" && (
          <OverdueTab data={overdueData} isLoading={overdueLoading} />
        )}

        {/* A/R Aging */}
        {activeTab === "aging" && (
          <AgingTab data={agingData} isLoading={agingLoading} />
        )}

        {/* Customers */}
        {activeTab === "customers" && (
          <CustomersTab data={customerData} isLoading={customerLoading} />
        )}

        {/* Other tabs placeholder */}
        {!["custom", "sales", "overdue", "aging", "customers"].includes(
          activeTab
        ) && (
          <div className="text-center text-gray-500 h-64 flex items-center justify-center">
            {tabs.find((t) => t.id === activeTab)?.name} implementation coming
            soon...
          </div>
        )}
      </div>
    </div>
  );
}
