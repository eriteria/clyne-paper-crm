import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configurable knobs via env or defaults
const MONTHS_BACK = parseInt(process.env.INVOICE_MONTHS_BACK || "6", 10);
const MIN_TERMS_DAYS = parseInt(process.env.MIN_TERMS_DAYS || "15", 10);
const MAX_TERMS_DAYS = parseInt(process.env.MAX_TERMS_DAYS || "60", 10);
const MIN_INVOICES_PER_CUSTOMER = parseInt(
  process.env.MIN_INVOICES_PER_CUSTOMER || "1",
  10
);
const MAX_INVOICES_PER_CUSTOMER = parseInt(
  process.env.MAX_INVOICES_PER_CUSTOMER || "3",
  10
);
const MIN_ITEMS_PER_INVOICE = parseInt(
  process.env.MIN_ITEMS_PER_INVOICE || "1",
  10
);
const MAX_ITEMS_PER_INVOICE = parseInt(
  process.env.MAX_ITEMS_PER_INVOICE || "4",
  10
);
const SKIP_CUSTOMERS_WITH_EXISTING_INVOICES =
  (process.env.SKIP_POPULATED || "false").toLowerCase() === "true";
const OUTSTANDING_ONLY =
  (process.env.OUTSTANDING_ONLY || "true").toLowerCase() === "true";
const CUSTOMER_LIMIT = parseInt(process.env.CUSTOMER_LIMIT || "0", 10);

// Probability weights for statuses when OUTSTANDING_ONLY is false
const PROB_PAID = Math.min(
  1,
  Math.max(0, parseFloat(process.env.PROB_PAID || "0.15"))
);
const PROB_PARTIAL = Math.min(
  1,
  Math.max(0, parseFloat(process.env.PROB_PARTIAL || "0.45"))
);
// PROB_OPEN is the remainder to 1
const PROB_OPEN = Math.max(0, 1 - (PROB_PAID + PROB_PARTIAL));

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateWithinLastMonths(months: number): Date {
  const now = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  const startTime = start.getTime();
  const endTime = now.getTime();
  const t = startTime + Math.random() * (endTime - startTime);
  return new Date(t);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildInvoiceNumber(date: Date): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `INV-${y}${m}${d}-${suffix}`;
}

async function pickBillerForCustomer(customerTeamId?: string | null) {
  // Prefer a Sales user on the same team, else any Sales/TeamLeader/Admin, else any active user
  const rolePriority = ["Sales", "TeamLeader", "Admin"];

  if (customerTeamId) {
    const teamSales = await prisma.user.findFirst({
      where: {
        isActive: true,
        teamId: customerTeamId,
        role: { name: { in: rolePriority } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (teamSales) return teamSales;
  }

  const anyPreferred = await prisma.user.findFirst({
    where: { isActive: true, role: { name: { in: rolePriority } } },
    orderBy: { createdAt: "asc" },
  });
  if (anyPreferred) return anyPreferred;

  const anyActive = await prisma.user.findFirst({ where: { isActive: true } });
  if (!anyActive) throw new Error("No active users found to assign as biller");
  return anyActive;
}

export async function seedInvoices() {
  console.log(
    "\n🧾 Seeding invoices using existing customers and inventory items..."
  );

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, contactPerson: true, teamId: true },
  });
  const inventoryItems = await prisma.inventoryItem.findMany({
    select: { id: true, name: true, unitPrice: true },
  });

  if (customers.length === 0) {
    console.log("No customers found. Aborting invoice seeding.");
    return;
  }
  if (inventoryItems.length === 0) {
    console.log("No inventory items found. Aborting invoice seeding.");
    return;
  }

  let createdCount = 0;
  let skippedCustomers = 0;
  let processedCustomers = 0;

  for (const customer of customers) {
    if (CUSTOMER_LIMIT > 0 && processedCustomers >= CUSTOMER_LIMIT) {
      break;
    }
    if (SKIP_CUSTOMERS_WITH_EXISTING_INVOICES) {
      const existing = await prisma.invoice.count({
        where: { customerId: customer.id },
      });
      if (existing > 0) {
        skippedCustomers++;
        continue;
      }
    }

    const biller = await pickBillerForCustomer(customer.teamId);
    const invoicesForCustomer = randInt(
      MIN_INVOICES_PER_CUSTOMER,
      Math.max(MIN_INVOICES_PER_CUSTOMER, MAX_INVOICES_PER_CUSTOMER)
    );

    for (let i = 0; i < invoicesForCustomer; i++) {
      const dueDate = randomDateWithinLastMonths(MONTHS_BACK);
      const termsDays = randInt(MIN_TERMS_DAYS, MAX_TERMS_DAYS);
      const invoiceDate = new Date(dueDate);
      invoiceDate.setDate(invoiceDate.getDate() - termsDays);

      const itemsCount = randInt(
        MIN_ITEMS_PER_INVOICE,
        Math.max(MIN_ITEMS_PER_INVOICE, MAX_ITEMS_PER_INVOICE)
      );

      // Build items and totals
      const chosenItems = Array.from({ length: itemsCount }).map(() =>
        randChoice(inventoryItems)
      );
      const itemCreates: Array<{
        inventoryItemId: string;
        quantity: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        lineTotal: Prisma.Decimal;
      }> = [];

      let total = new Prisma.Decimal(0);
      for (const item of chosenItems) {
        const qtyNum = randInt(1, 10);
        const qty = new Prisma.Decimal(qtyNum);
        const unitPrice = new Prisma.Decimal(item.unitPrice); // ensure Decimal
        const lineTotal = unitPrice.mul(qty);
        total = total.add(lineTotal);

        itemCreates.push({
          inventoryItemId: item.id,
          quantity: qty,
          unitPrice,
          lineTotal,
        });
      }

      const discount = new Prisma.Decimal(0);
      const tax = new Prisma.Decimal(0);
      const gross = total.sub(discount).add(tax);

      // Decide payment status
      let status: string;
      let balance: Prisma.Decimal;
      if (OUTSTANDING_ONLY) {
        // Only PARTIAL or OPEN
        if (Math.random() < 0.6) {
          status = "PARTIAL";
          const paidFraction = new Prisma.Decimal(
            (randInt(20, 70) / 100).toFixed(2)
          );
          balance = gross.mul(new Prisma.Decimal(1).sub(paidFraction));
        } else {
          status = "OPEN";
          balance = gross;
        }
      } else {
        const roll = Math.random();
        if (roll < PROB_PAID) {
          status = "PAID";
          balance = new Prisma.Decimal(0);
        } else if (roll < PROB_PAID + PROB_PARTIAL) {
          status = "PARTIAL";
          const paidFraction = new Prisma.Decimal(
            (randInt(10, 80) / 100).toFixed(2)
          );
          balance = gross.mul(new Prisma.Decimal(1).sub(paidFraction));
        } else {
          status = "OPEN";
          balance = gross;
        }
      }

      // Try to create with a unique invoice number; retry if collision
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const invoiceNumber = buildInvoiceNumber(invoiceDate);
        try {
          await prisma.invoice.create({
            data: {
              invoiceNumber,
              date: invoiceDate,
              dueDate,
              customerId: customer.id,
              customerName: customer.name,
              customerContact: customer.contactPerson || undefined,
              billedByUserId: biller.id,
              teamId: customer.teamId || undefined,
              // regionId left null/undefined; can be populated via other mappers if needed
              totalAmount: gross,
              balance,
              taxAmount: tax,
              discountAmount: discount,
              status,
              createdAt: invoiceDate,
              items: {
                create: itemCreates,
              },
              notes: `Seeded invoice (terms ${termsDays} days)`,
            },
          });
          created = true;
          createdCount++;
        } catch (err: any) {
          // Unique constraint failed on the fields: (`invoice_number`)
          if (err?.code === "P2002") {
            // Retry with a different suffix
            continue;
          }
          console.error("Failed creating invoice:", err);
          throw err;
        }
      }
    }
    processedCustomers++;
  }

  console.log(
    `✅ Invoices seeded: ${createdCount}. Skipped customers (already had invoices): ${skippedCustomers}.`
  );
}

if (require.main === module) {
  seedInvoices()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
