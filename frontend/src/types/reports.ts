// Report types for the comprehensive reporting system

export interface ReportFilters {
  startDate: string;
  endDate: string;
  reportType: string;
}

export interface ExecutiveReport {
  period: { start: string; end: string };
  revenue: {
    current: number;
    previous: number;
    growth: number;
    invoiceCount: number;
  };
  customers: {
    new: number;
    total: number;
    active: number;
    retention: number;
  };
  topProducts: Array<{
    sku: string;
    name: string;
    revenue: number;
    quantity: number;
    orderCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    invoice_count: number;
  }>;
  teamPerformance: Array<{
    name: string;
    revenue: number;
    members: number;
  }>;
}

export interface CustomerReport {
  period: { start: string; end: string };
  overview: {
    totalCustomers: number;
    newCustomers: number;
    newCustomersPrevious: number;
    customerGrowthRate: number;
    activeCustomers: number;
    retentionRate: number;
    atRiskCustomers: number;
  };
  acquisition: Array<{
    month: string;
    new_customers: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    revenue: number;
    invoiceCount: number;
    avgOrderValue: number;
    firstPurchase?: string;
    lastPurchase?: string;
  }>;
  segmentation: Array<{
    segment: string;
    customer_count: number;
    segment_revenue: number;
    avg_revenue_per_customer: number;
  }>;
  locationDistribution: Array<{
    location_id: string;
    location_name: string;
    customer_count: number;
    location_revenue: number;
  }>;
  paymentBehavior: Array<{
    payment_type: string;
    customer_count: number;
    avg_payment_days: number;
  }>;
}

export interface SalesReport {
  summary: {
    totalInvoices: number;
    totalSales: number;
    averageSale: number;
  };
  byStatus: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  topPerformers: Array<{
    userId: string;
    fullName: string;
    email: string;
    teamName: string;
    invoiceCount: number;
    totalSales: number;
  }>;
  filters: {
    startDate: string | null;
    endDate: string | null;
    userId: string | null;
    teamId: string | null;
    regionId: string | null;
  };
}

export interface InventoryReport {
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockCount: number;
  };
  byLocation: Array<{
    location: string;
    itemCount: number;
    totalQuantity: number;
    totalValue: number;
  }>;
  topItems: Array<{
    id: string;
    name: string;
    sku: string;
    currentQuantity: number;
    unitPrice: number;
  }>;
  reorderNeeded: Array<{
    id: string;
    name: string;
    sku: string;
    currentQuantity: number;
    minStock: number;
    location: string;
  }>;
}

export interface TeamReport {
  summary: {
    totalTeams: number;
    totalMembers: number;
    totalActiveMembners: number;
    totalSales: number;
  };
  teams: Array<{
    id: string;
    name: string;
    location: string;
    leader: string;
    memberCount: number;
    activeMemberCount: number;
    totalSales: number;
    completedInvoices: number;
    pendingInvoices: number;
    totalInvoices: number;
    averageSalePerMember: number;
  }>;
}

export interface OperationalReport {
  period: { start: string; end: string };
  waybills: {
    byStatus: Array<{
      status: string;
      _count: number;
    }>;
    avgProcessingTime: number;
  };
  inventory: {
    turnover: Array<{
      location: string;
      item_count: number;
      avg_stock: number;
      low_stock_count: number;
    }>;
  };
  invoices: {
    byStatus: Array<{
      status: string;
      _count: number;
      _sum: { totalAmount: number };
    }>;
  };
  delivery: {
    onTimeDeliveries: number;
    averageDeliveryDays: number;
    delayedDeliveries: number;
  };
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  team: string | null;
  billedBy: string | null;
  totalAmount: number;
  balance: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

// Export request/response types
export interface ExportRequest {
  reportType: string;
  format: "json" | "csv" | "pdf";
  startDate?: string;
  endDate?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface ExportResponse {
  reportType: string;
  format: string;
  filename: string;
  data:
    | ExecutiveReport
    | CustomerReport
    | SalesReport
    | InventoryReport
    | TeamReport
    | OperationalReport;
  generatedAt: string;
}

// Chart data types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}

// Report configuration
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  category:
    | "executive"
    | "sales"
    | "customers"
    | "inventory"
    | "teams"
    | "operations";
  requiresDateRange: boolean;
  supportedFormats: Array<"json" | "csv" | "pdf">;
  refreshInterval?: number; // minutes
  cacheTimeout?: number; // minutes
}

// Accounts Receivable Aging
export type AgingBucketKey =
  | "current"
  | "d1_30"
  | "d31_60"
  | "d61_90"
  | "d90_plus";

export interface ARAgingInvoice {
  id: string;
  date: string; // ISO
  dueDate: string | null; // ISO
  balance: number;
  daysPastDueOrOutstanding: number;
  bucket: AgingBucketKey;
}

export interface ARAgingCustomer {
  customerId: string;
  customerName: string | null;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total: number;
  invoices?: ARAgingInvoice[];
}

export interface ARAgingTotals {
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  total: number;
}

export interface ARAgingReport {
  asOf: string; // ISO
  mode: "due" | "outstanding";
  netDays: number;
  filters: { teamId?: string; regionId?: string; customerId?: string };
  totals: ARAgingTotals;
  customers: ARAgingCustomer[];
}
