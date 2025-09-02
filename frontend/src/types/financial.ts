export interface FinancialDashboard {
  totalRevenue: number;
  outstandingAmount: number;
  outstandingCount: number;
  recentPayments: Payment[];
  monthlyRevenue: MonthlyRevenue[];
  paymentMethods: PaymentMethodSummary[];
  taxCollected: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
  recordedByUserId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    customer: {
      id: string;
      name: string;
      email?: string;
    };
  };
  recordedBy: {
    fullName: string;
  };
}

export interface MonthlyRevenue {
  month: string;
  total_paid: number;
  total_invoiced: number;
}

export interface PaymentMethodSummary {
  paymentMethod: string;
  _sum: {
    amount: number;
  };
  _count: number;
}

export interface QuickBooksExport {
  id: string;
  exportType: string;
  entityIds: string[];
  exportData: string;
  exportedByUserId: string;
  exportDate: string;
  filename?: string;
  status: string;
  notes?: string;
  createdAt: string;
  exportedBy: {
    fullName: string;
  };
}

export interface FinancialReport {
  period: {
    start: string;
    end: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

export interface ExportData {
  exportType: "INVOICES" | "PAYMENTS";
  entityIds?: string[];
  startDate?: string;
  endDate?: string;
}
