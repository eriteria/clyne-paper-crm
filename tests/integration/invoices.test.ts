import request from "supertest";
import { Express } from "express";
import { PrismaClient } from "@prisma/client";
import {
  getTestPrismaClient,
  cleanDatabase,
  seedBasicData,
} from "../utils/testDb";
import { createTestFactory, TestDataFactory } from "../factories";
import { createApp } from "../../backend/src/app";

describe("Invoice API Integration Tests", () => {
  let app: Express;
  let prisma: PrismaClient;
  let factory: TestDataFactory;
  let testData: any;
  let authToken: string;

  beforeAll(async () => {
    prisma = getTestPrismaClient();
    await prisma.$connect();
    app = createApp({ enableRateLimit: false });
    factory = createTestFactory(prisma);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    testData = await seedBasicData(prisma);

    // Create authenticated user
    const { user, password } = await factory.users.createAdmin({
      primaryLocationId: testData.testLocation.id,
    });

    // Login to get token
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: user.email,
        password,
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/invoices", () => {
    it("should create a new invoice with single line item", async () => {
      const customer = await factory.customers.create({
        locationId: testData.testLocation.id,
      });

      const { inventoryItems } = await factory.createInventoryScenario();

      const invoiceData = {
        customerId: customer.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            inventoryItemId: inventoryItems[0].id,
            quantity: 10,
            unitPrice: 100,
            description: "Test item",
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.customerId).toBe(customer.id);
      expect(response.body.data.totalAmount).toBe(1000); // 10 * 100
      expect(response.body.data.items).toHaveLength(1);
    });

    it("should create invoice with multiple line items", async () => {
      const customer = await factory.customers.create({
        locationId: testData.testLocation.id,
      });

      const { inventoryItems } = await factory.createInventoryScenario();

      const invoiceData = {
        customerId: customer.id,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [
          {
            inventoryItemId: inventoryItems[0].id,
            quantity: 10,
            unitPrice: 100,
          },
          {
            inventoryItemId: inventoryItems[1].id,
            quantity: 5,
            unitPrice: 150,
          },
        ],
      };

      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.totalAmount).toBe(1750); // (10*100) + (5*150)
    });

    it("should reject invoice with invalid customer ID", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customerId: "invalid-customer-id",
          dueDate: new Date().toISOString(),
          items: [{ quantity: 1, unitPrice: 100 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject invoice with missing required fields", async () => {
      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should reject invoice with zero or negative amounts", async () => {
      const customer = await factory.customers.create();

      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          items: [{ quantity: -5, unitPrice: 100 }],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/invoices", () => {
    it("should list all invoices", async () => {
      await factory.invoices.createMany(5);

      const response = await request(app)
        .get("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(5);
    });

    it("should filter invoices by status", async () => {
      await factory.invoices.create({ status: "PAID" });
      await factory.invoices.create({ status: "PENDING" });
      await factory.invoices.create({ status: "PENDING" });

      const response = await request(app)
        .get("/api/invoices?status=PENDING")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].status).toBe("PENDING");
    });

    it("should paginate invoice results", async () => {
      await factory.invoices.createMany(15);

      const response = await request(app)
        .get("/api/invoices?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
    });
  });

  describe("GET /api/invoices/:id", () => {
    it("should get invoice by ID", async () => {
      const invoice = await factory.invoices.create();

      const response = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(invoice.id);
      expect(response.body.data).toHaveProperty("customer");
      expect(response.body.data).toHaveProperty("items");
    });

    it("should return 404 for non-existent invoice", async () => {
      const response = await request(app)
        .get("/api/invoices/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("PUT /api/invoices/:id", () => {
    it("should update invoice details", async () => {
      const invoice = await factory.invoices.create({ status: "PENDING" });

      const response = await request(app)
        .put(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          notes: "Updated notes",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.notes).toBe("Updated notes");
    });

    it("should not allow updating PAID invoices", async () => {
      const invoice = await factory.invoices.createPaid();

      const response = await request(app)
        .put(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          totalAmount: 5000,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("paid");
    });
  });

  describe("DELETE /api/invoices/:id", () => {
    it("should soft delete invoice", async () => {
      const invoice = await factory.invoices.create();

      const response = await request(app)
        .delete(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify soft delete
      const deletedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(deletedInvoice).toBeTruthy();
      expect(deletedInvoice?.deletedAt).toBeTruthy();
    });

    it("should not allow deleting PAID invoices", async () => {
      const invoice = await factory.invoices.createPaid();

      const response = await request(app)
        .delete(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/invoices/:id/send", () => {
    it("should send invoice via email", async () => {
      const customer = await factory.customers.create({
        email: "customer@test.com",
      });

      const invoice = await factory.invoices.create({
        customerId: customer.id,
      });

      const response = await request(app)
        .post(`/api/invoices/${invoice.id}/send`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("sent");
    });

    it("should fail for customer without email", async () => {
      const customer = await factory.customers.create({ email: null });

      const invoice = await factory.invoices.create({
        customerId: customer.id,
      });

      const response = await request(app)
        .post(`/api/invoices/${invoice.id}/send`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/invoices/:id/pay", () => {
    it("should mark invoice as paid", async () => {
      const invoice = await factory.invoices.create({ status: "PENDING" });

      const response = await request(app)
        .post(`/api/invoices/${invoice.id}/pay`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          paymentMethod: "BANK_TRANSFER",
          amount: invoice.totalAmount,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("PAID");
    });

    it("should handle partial payments", async () => {
      const invoice = await factory.invoices.create({
        totalAmount: 10000,
        status: "PENDING",
      });

      const response = await request(app)
        .post(`/api/invoices/${invoice.id}/pay`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          paymentMethod: "CASH",
          amount: 5000,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("PARTIALLY_PAID");
    });

    it("should not allow overpayment", async () => {
      const invoice = await factory.invoices.create({ totalAmount: 10000 });

      const response = await request(app)
        .post(`/api/invoices/${invoice.id}/pay`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          paymentMethod: "CASH",
          amount: 15000,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Authorization", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/api/invoices");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/invoices")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
