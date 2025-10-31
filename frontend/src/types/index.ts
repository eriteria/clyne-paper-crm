// Shared app types for the frontend

// Users
export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  roleId?: string;
  permissions?: string[];
  team?: {
    id: string;
    name: string;
    region?: {
      id: string;
      name: string;
      createdAt?: string;
      updatedAt?: string;
    };
  };
  primaryLocationId?: string;
  primaryLocation?: {
    id: string;
    name: string;
  };
  assignedLocations?: Array<{
    locationId: string;
    location: {
      id: string;
      name: string;
    };
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

// Generic API shape
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Catalog
export interface Product {
  id: string;
  name: string;
  productGroupId: string;
  monthlyTarget: string;
  createdAt: string;
  updatedAt: string;
  productGroup?: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  inventoryItems?: unknown[];
  monthlySales?: number;
  totalSales?: number;
  targetProgress?: number;
}

// Geography / Org
export interface Region {
  id: string;
  name: string;
  parentRegionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  _count?: {
    customers: number;
    teams: number;
  };
  teams?: Team[];
  createdAt: string;
  updatedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  regionId: string;
  leaderUserId?: string;
  region?: {
    id: string;
    name: string;
  };
  locations?: {
    location: {
      id: string;
      name: string;
    };
  }[];
  leader?: {
    id: string;
    fullName: string;
    email?: string;
  };
  members: User[];
  _count?: {
    members: number;
    customers: number;
    invoices: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Customers
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  contactPerson?: string;
  locationId: string;
  defaultPaymentTermDays: number;
  locationRef?: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
  };
  team?: {
    id: string;
    name: string;
    description?: string;
  };
  relationshipManagerId?: string;
  relationshipManager?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Inventory
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  unitPrice: number;
  currentQuantity: number;
  minStock: number;
  locationId: string;
  location?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Invoices
export interface InvoiceItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  inventoryItem: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export type InvoiceStatus =
  | "DRAFT"
  | "OPEN"
  | "COMPLETED"
  | "PENDING"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  // Some endpoints/UI may use lowercase strings
  | "pending"
  | "paid"
  | "overdue"
  | "cancelled";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerContact?: string;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  notes?: string;
  dueDate?: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  bankAccountId?: string;
  balance?: number;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  billedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  team?: {
    id: string;
    name: string;
  };
  region?: {
    id: string;
    name: string;
  };
  bankAccount?: {
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  items: InvoiceItem[];
}

// Dashboard
export interface DashboardData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalInventoryItems: number;
    lowStockCount: number;
    totalInvoices: number;
    pendingInvoices: number;
    totalWaybills: number;
    totalInventoryValue: number;
  };
  teams: Array<{
    id: string;
    name: string;
    region?: string;
    memberCount: number;
  }>;
  lowStockItems: InventoryItem[];
}

// Waybills
export interface Waybill {
  id: string;
  waybillNumber: string;
  date: string;
  supplier: string;
  locationId: string;
  sourceLocationId?: string;
  transferType: "RECEIVING" | "SENDING";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "REVIEW";
  processedAt?: string;
  processedBy?: string;
  receivedByUserId: string;
  notes?: string;
  createdAt: string;
  destinationLocation?: {
    id: string;
    name: string;
  };
  sourceLocation?: {
    id: string;
    name: string;
  };
  // Legacy field for backward compatibility
  location?: {
    id: string;
    name: string;
  };
  receivedBy?: {
    id: string;
    fullName: string;
  };
  items?: Array<{
    id: string;
    sku: string;
    name: string;
    quantityReceived: number;
    unitCost: number;
    status: string;
  }>;
}

// Sales Returns
export type ItemCondition = "Good" | "Damaged" | "Defective";
export type RefundMethod = "Credit Note" | "Bank Transfer";
export type RefundStatus = "Pending" | "Completed";
export type RestockStatus = "Pending" | "Restocked" | "Not Restocked";

export interface SalesReturnItem {
  id: string;
  salesReturnId: string;
  inventoryItemId: string;
  productName: string;
  sku: string;
  quantityReturned: number;
  unitPrice: number;
  subtotal: number;
  condition: ItemCondition;
  restocked: boolean;
  inventoryItem?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  invoiceId: string;
  customerId: string;
  returnDate: string;
  reason: string;
  notes?: string;
  totalAmount: number;
  refundMethod: RefundMethod;
  refundStatus: RefundStatus;
  restockStatus: RestockStatus;
  processedAt?: string;
  processedById?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  invoice?: Invoice;
  items: SalesReturnItem[];
  processedBy?: {
    id: string;
    fullName: string;
    email: string;
  };
  createdBy?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface CreateSalesReturnItem {
  inventoryItemId: string;
  productName: string;
  sku: string;
  quantityReturned: number;
  unitPrice: number;
  condition: ItemCondition;
}

export interface CreateSalesReturnData {
  invoiceId: string;
  reason: string;
  notes?: string;
  refundMethod: RefundMethod;
  items: CreateSalesReturnItem[];
}
