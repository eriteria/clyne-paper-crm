"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
} from "lucide-react";
import {
  exportReport,
  getOverdueInvoices,
  getSalesReport,
  getARAging,
} from "@/lib/reports-api";
import type { OverdueInvoice, ARAgingReport, ARAgingCustomer } from "@/types/reports";
import type { SalesReport } from "@/types/reports";
import { format } from "date-fns";

// Utility Functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
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
          title="Top Performer"
          value={data.topPerformers[0]?.fullName || "-"}
          change={`₦${formatNumber(
            data.topPerformers[0]?.totalSales || 0
          )} sales`}
          changeColor="text-green-600"
        />
      </div>

      {/* Sales by Status */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Sales by Status
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.byStatus}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={formatNumber} />
            <Tooltip formatter={formatNumber} />
            <Bar dataKey="totalAmount" fill="#3B82F6" name="Total Sales" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers Table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Sales Performers
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
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
  const totalOverdueAmount = data.reduce(
    (sum, invoice) => sum + invoice.balance,
    0
  );
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
function AgingTab({ data, isLoading }: { data?: ARAgingReport; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">Loading A/R aging...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 h-64 flex items-center justify-center">No receivables data</div>
    );
  }

  const buckets = [
    { key: "current", label: "Current" },
    { key: "d1_30", label: "1–30" },
    { key: "d31_60", label: "31–60" },
    { key: "d61_90", label: "61–90" },
    { key: "d90_plus", label: "90+" },
  ] as const;

  const formatCurrency = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="space-y-8">
      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <MetricCard icon={DollarSign} iconColor="text-gray-700" title="Current" value={formatCurrency(data.totals.current)} change="" changeColor="text-gray-500" />
        <MetricCard icon={DollarSign} iconColor="text-yellow-700" title="1–30" value={formatCurrency(data.totals.d1_30)} change="" changeColor="text-gray-500" />
        <MetricCard icon={DollarSign} iconColor="text-orange-700" title="31–60" value={formatCurrency(data.totals.d31_60)} change="" changeColor="text-gray-500" />
        <MetricCard icon={DollarSign} iconColor="text-red-700" title="61–90" value={formatCurrency(data.totals.d61_90)} change="" changeColor="text-gray-500" />
        <MetricCard icon={DollarSign} iconColor="text-red-800" title="90+" value={formatCurrency(data.totals.d90_plus)} change="" changeColor="text-gray-500" />
      </div>

      {/* Per-customer table */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">A/R Aging by Customer</h3>
          <div className="text-sm text-gray-500">As of {new Date(data.asOf).toLocaleDateString()}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                {buckets.map(b => (
                  <th key={b.key} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{b.label}</th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.customers.map((c: ARAgingCustomer) => (
                <tr key={c.customerId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{c.customerName || c.customerId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(c.current)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(c.d1_30)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(c.d31_60)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(c.d61_90)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(c.d90_plus)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">{formatCurrency(c.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Grand Total</td>
                <td className="px-6 py-3 text-right text-sm font-semibold">{formatCurrency(data.totals.current)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold">{formatCurrency(data.totals.d1_30)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold">{formatCurrency(data.totals.d31_60)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold">{formatCurrency(data.totals.d61_90)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold">{formatCurrency(data.totals.d90_plus)}</td>
                <td className="px-6 py-3 text-right text-sm font-bold">{formatCurrency(data.totals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: "2000-01-01",
    endDate: new Date().toISOString().split("T")[0],
  });

  const [activeTab, setActiveTab] = useState("executive");

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
  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ["ar-aging", filters.endDate],
    queryFn: () => getARAging(filters.endDate),
  });

  const tabs = [
    { id: "executive", name: "Executive Summary", icon: BarChart3 },
    { id: "sales", name: "Sales Performance", icon: TrendingUp },
    { id: "overdue", name: "Overdue Invoices", icon: Target },
    { id: "aging", name: "A/R Aging", icon: FileText },
    { id: "inventory", name: "Inventory", icon: Package },
    { id: "customers", name: "Customers", icon: Users },
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
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
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

        {/* Other tabs placeholder */}
        {!["sales", "overdue"].includes(activeTab) && (
          <div className="text-center text-gray-500 h-64 flex items-center justify-center">
            {tabs.find((t) => t.id === activeTab)?.name} implementation coming
            soon...
          </div>
        )}
      </div>
    </div>
  );
}
