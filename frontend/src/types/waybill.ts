export interface Waybill {
  id: string;
  waybillNumber: string;
  supplier: string;
  date: string;
  locationId: string;
  status: WaybillStatus;
  processedAt?: string;
  processedBy?: string;
  receivedByUserId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location: {
    id: string;
    name: string;
    description?: string;
  };
  receivedBy: {
    id: string;
    fullName: string;
  };
  items: WaybillItem[];
}

export interface WaybillItem {
  id: string;
  waybillId: string;
  sku: string;
  name: string;
  description?: string;
  unit: string;
  quantityReceived: number;
  unitCost: number;
  batchNo?: string;
  expiryDate?: string;
  inventoryItemId?: string;
  status: WaybillItemStatus;
  processedAt?: string;
  inventoryItem?: {
    id: string;
    name: string;
    currentQuantity: number;
  };
}

export enum WaybillStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  REVIEW = "REVIEW",
}

export enum WaybillItemStatus {
  PENDING = "PENDING",
  MATCHED = "MATCHED",
  NEW_PRODUCT = "NEW_PRODUCT",
  PROCESSED = "PROCESSED",
}

export interface CreateWaybillRequest {
  waybillNumber: string;
  supplierName: string;
  supplierContact?: string;
  locationId: string;
  notes?: string;
  items: CreateWaybillItemRequest[];
}

export interface CreateWaybillItemRequest {
  sku: string;
  name: string;
  description?: string;
  unit: string;
  quantityShipped: number;
  quantityReceived: number;
  unitCost: number;
  notes?: string;
}

export interface ProcessWaybillResponse {
  message: string;
  status: WaybillStatus;
  results: {
    matched: number;
    processed: number;
    newProducts: number;
  };
  details: {
    matched: Array<{
      waybillItem: WaybillItem;
      inventoryItem: {
        id: string;
        name: string;
        currentQuantity: number;
        unitPrice: number;
      };
    }>;
    processed: Array<{
      waybillItem: WaybillItem;
      inventoryItem: {
        id: string;
        name: string;
        currentQuantity: number;
        unitPrice: number;
      };
    }>;
    newProducts: WaybillItem[];
  };
}

export interface ApproveProductsRequest {
  approvedItems: Array<{
    waybillItemId: string;
    productData: {
      name?: string;
      description?: string;
      unit?: string;
      minStock?: number;
    };
  }>;
}
