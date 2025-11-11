import { PrismaClient, WaybillStatus } from "@prisma/client";
import { generateTestId } from "../utils/testDb";

export interface CreateWaybillOptions {
  locationId?: string;
  receivedByUserId?: string;
  waybillNumber?: string;
  date?: Date;
  supplier?: string;
  notes?: string;
  status?: WaybillStatus;
  sourceLocationId?: string;
  transferType?: string;
  items?: Array<{
    sku: string;
    name: string;
    quantityReceived: number;
    unitCost: number;
    unit?: string;
    batchNo?: string;
    expiryDate?: Date;
  }>;
}

/**
 * Factory for creating test waybills
 */
export class WaybillFactory {
  constructor(private prisma: PrismaClient) {}

  async create(options: CreateWaybillOptions = {}) {
    const {
      locationId,
      receivedByUserId,
      waybillNumber = `WB-TEST-${generateTestId()}`,
      date = new Date(),
      supplier = "Test Supplier",
      notes,
      status = "PENDING",
      sourceLocationId,
      transferType = "RECEIVING",
      items = [],
    } = options;

    // Get location if not provided
    let finalLocationId = locationId;
    if (!finalLocationId) {
      const location = await this.prisma.location.findFirst();
      if (!location) {
        throw new Error("No location found. Create a location first.");
      }
      finalLocationId = location.id;
    }

    // Get user if not provided
    let finalUserId = receivedByUserId;
    if (!finalUserId) {
      const user = await this.prisma.user.findFirst();
      if (!user) {
        throw new Error("No user found. Create a user first.");
      }
      finalUserId = user.id;
    }

    const waybill = await this.prisma.waybill.create({
      data: {
        locationId: finalLocationId,
        receivedByUserId: finalUserId,
        waybillNumber,
        date,
        supplier,
        notes,
        status,
        sourceLocationId,
        transferType,
        items: {
          create: items.map((item) => ({
            sku: item.sku,
            name: item.name,
            quantityReceived: item.quantityReceived,
            unitCost: item.unitCost,
            unit: item.unit || "pcs",
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            status: "PENDING",
          })),
        },
      },
      include: {
        destinationLocation: true,
        sourceLocation: true,
        receivedBy: true,
        items: true,
      },
    });

    return waybill;
  }

  async createWithItems(
    itemCount: number = 3,
    options: Partial<CreateWaybillOptions> = {}
  ) {
    const items = Array.from({ length: itemCount }, (_, i) => ({
      sku: `SKU-TEST-${i + 1}-${generateTestId()}`,
      name: `Test Item ${i + 1}`,
      quantityReceived: 100 + i * 50,
      unitCost: 50 + i * 10,
      unit: "pcs",
      batchNo: `BATCH-${generateTestId()}`,
    }));

    return this.create({
      ...options,
      items,
    });
  }

  async createApproved(options: Partial<CreateWaybillOptions> = {}) {
    return this.create({
      ...options,
      status: "APPROVED",
      processedAt: new Date(),
    });
  }

  async createTransfer(
    sourceLocationId: string,
    destinationLocationId: string,
    options: Partial<CreateWaybillOptions> = {}
  ) {
    return this.create({
      ...options,
      sourceLocationId,
      locationId: destinationLocationId,
      transferType: "TRANSFER",
    });
  }

  async createMany(count: number, options: CreateWaybillOptions = {}) {
    const waybills = [];
    for (let i = 0; i < count; i++) {
      waybills.push(
        await this.create({
          ...options,
          waybillNumber: `WB-TEST-${i}-${generateTestId()}`,
        })
      );
    }
    return waybills;
  }
}
