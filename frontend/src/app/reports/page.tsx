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
    return "₦0";
  }

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
      minimumFractionDigits: 0,
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
  const [aggregations, setAggregations] = useState<string[]>(["count", "sum:totalAmount"]);
  
  const { mutate: runReport, data, isLoading, error } = useMutation({
    mutationFn: async (request: DynamicReportRequest) => {
      return await runDynamicReport(request);
    },
  });

  // Quick report templates
  const quickReports = [
    {
      id: "revenueByLocation",
      name: "Revenue by Location",
      icon: Target,
      description: "Sales breakdown by business location",
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
    <div className="space-y-8">
      {/* Quick Reports */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickReports.map((report) => (
            <button
              key={report.id}
              onClick={() => handleQuickReport(report.id)}
              disabled={isLoading}
              className={`p-4 border rounded-lg text-left transition-all hover:shadow-md hover:border-blue-300 ${
                selectedTemplate === report.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <report.icon className="h-5 w-5 text-blue-600" />
                {isLoading && selectedTemplate === report.id && (
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                )}
              </div>
              <div className="font-medium text-sm text-gray-900">{report.name}</div>
              <div className="text-xs text-gray-500 mt-1">{report.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Report Builder */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Custom Report Builder</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Model
            </label>
            <select
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="invoice">Invoices</option>
              <option value="customerPayment">Payments</option>
              <option value="customer">Customers</option>
              <option value="inventoryItem">Inventory</option>
              <option value="waybill">Waybills</option>
              <option value="invoiceItem">Invoice Items</option>
            </select>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group By
            </label>
            <select
              value={groupByField}
              onChange={(e) => setGroupByField(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Grouping (Summary Only)</option>
              <option value="status">Status</option>
              <option value="customerId">Customer</option>
              <option value="customerName">Customer Name</option>
              <option value="teamId">Team</option>
              <option value="locationId">Location</option>
              <option value="paymentMethod">Payment Method</option>
              <option value="billedByUserId">Sales Person</option>
            </select>
          </div>

          {/* Aggregations */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metrics
            </label>
            <div className="space-y-2 border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
              {["count", "sum:totalAmount", "avg:totalAmount", "sum:amount", "avg:amount", "min:amount", "max:amount"].map((agg) => (
                <label key={agg} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={aggregations.includes(agg)}
                    onChange={() => toggleAggregation(agg)}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {agg.replace(":", " ")}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filters (for invoice/payment models) */}
          {(customModel === "invoice" || customModel === "customerPayment") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <div className="space-y-2 border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                {customModel === "invoice" 
                  ? ["PAID", "PARTIALLY_PAID", "OPEN", "PARTIAL", "CANCELLED"].map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes(status)}
                          onChange={() => toggleStatus(status)}
                          className="mr-2 rounded"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))
                  : ["COMPLETED", "PENDING", "FAILED"].map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filterStatus.includes(status)}
                          onChange={() => toggleStatus(status)}
                          className="mr-2 rounded"
                        />
                        <span className="text-sm text-gray-700">{status}</span>
                      </label>
                    ))
                }
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCustomReport}
          disabled={isLoading || aggregations.length === 0}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Report...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4 mr-2" />
              Run Custom Report
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold">Error Running Report</h3>
              <p className="text-red-700 text-sm mt-1">{(error as any).message || "An unexpected error occurred"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {data && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Report Results</h2>
              <p className="text-sm text-gray-500 mt-1">
                {data.queryType === "groupBy" 
                  ? `${data.resultCount || 0} groups` 
                  : `Summary aggregation`}
                {" • "}Model: {data.model}
              </p>
            </div>
            <button
              onClick={() => {
                const dataStr = JSON.stringify(data, null, 2);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `report-${new Date().toISOString()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>

          <div className="p-6">
            {/* GroupBy Results */}
            {data.queryType === "groupBy" && data.data && data.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(data.data[0]).map((key) => (
                        <th
                          key={key}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key.replace("_", " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.entries(row).map(([key, value]: [string, any], cellIdx) => (
                          <td key={cellIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {typeof value === "object" && value !== null
                              ? Object.entries(value).map(([k, v]) => (
                                  <div key={k}>
                                    <span className="text-gray-500">{k}:</span>{" "}
                                    {typeof v === "number" 
                                      ? (k.includes("amount") || k.includes("Amount") || k.includes("total") || k.includes("Total")
                                          ? formatCurrency(v)
                                          : formatNumber(v))
                                      : String(v)}
                                  </div>
                                ))
                              : typeof value === "number"
                              ? formatNumber(value)
                              : String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Aggregate Results */}
            {data.queryType === "aggregate" && data.aggregation && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(data.aggregation).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 uppercase">
                      {key.replace("_", " ")}
                    </div>
                    {typeof value === "object" && value !== null ? (
                      Object.entries(value).map(([k, v]) => (
                        <div key={k}>
                          <div className="text-xs text-gray-400">{k}</div>
                          <div className="text-xl font-bold text-gray-900">
                            {typeof v === "number"
                              ? (k.includes("amount") || k.includes("Amount") || k.includes("total") || k.includes("Total")
                                  ? formatCurrency(v)
                                  : formatNumber(v))
                              : String(v)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-2xl font-bold text-gray-900">
                        {typeof value === "number" ? formatNumber(value) : String(value)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {((data.queryType === "groupBy" && (!data.data || data.data.length === 0)) ||
              (data.queryType === "aggregate" && !data.aggregation)) && (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p>No data available for the selected criteria</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!data && !isLoading && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Target className="h-6 w-6 text-blue-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-blue-900 font-semibold mb-2">How to Use Custom Reports</h3>
              <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
                <li><strong>Quick Reports:</strong> Click any template above for instant insights</li>
                <li><strong>Custom Builder:</strong> Select model, grouping, and metrics for flexible analysis</li>
                <li><strong>Date Range:</strong> Use the filters at the top to set your reporting period</li>
                <li><strong>Export:</strong> Download results as JSON for further analysis</li>
              </ul>
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
        {!["custom", "sales", "overdue", "aging", "customers"].includes(activeTab) && (
          <div className="text-center text-gray-500 h-64 flex items-center justify-center">
            {tabs.find((t) => t.id === activeTab)?.name} implementation coming
            soon...
          </div>
        )}
      </div>
    </div>
  );
}
