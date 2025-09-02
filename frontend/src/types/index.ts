export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  team?: {
    id: string;
    name: string;
    region?: {
      id: string;
      name: string;
    };
  };
  region?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  contactPerson?: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  unitPrice: number;
  currentQuantity: number;
  minStock: number;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

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
  status: "DRAFT" | "PENDING" | "PAID" | "OVERDUE" | "CANCELLED";
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
  items: InvoiceItem[];
}

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

export interface Team {
  id: string;
  name: string;
  region?: {
    id: string;
    name: string;
  };
  leader?: {
    id: string;
    fullName: string;
  };
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  name: string;
  parentRegionId?: string;
  createdAt: string;
  updatedAt: string;
}
