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

describe("Payment API Integration Tests", () => {
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

    const { user, password } = await factory.users.createAdmin({
      primaryLocationId: testData.testLocation.id,
    });

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

  describe("POST /api/payments", () => {
    it("should record a payment for an invoice", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({
        customerId: customer.id,
        totalAmount: 10000,
        status: "PENDING",
      });

      const paymentData = {
        invoiceId: invoice.id,
        amount: 10000,
        paymentMethod: "BANK_TRANSFER",
        transactionReference: `TXN-${Date.now()}`,
        paymentDate: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send(paymentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.amount).toBe(10000);
      expect(response.body.data.paymentMethod).toBe("BANK_TRANSFER");
    });

    it("should handle partial payments", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({
        customerId: customer.id,
        totalAmount: 10000,
        status: "PENDING",
      });

      // First partial payment
      const payment1Response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 4000,
          paymentMethod: "CASH",
        });

      expect(payment1Response.status).toBe(201);

      // Second partial payment
      const payment2Response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 3000,
          paymentMethod: "CASH",
        });

      expect(payment2Response.status).toBe(201);

      // Check invoice status
      const invoiceResponse = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(invoiceResponse.body.data.status).toBe("PARTIALLY_PAID");
      expect(invoiceResponse.body.data.paidAmount).toBe(7000);
      expect(invoiceResponse.body.data.balance).toBe(3000);
    });

    it("should update invoice status to PAID when fully paid", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({
        customerId: customer.id,
        totalAmount: 5000,
        status: "PENDING",
      });

      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: "BANK_TRANSFER",
        });

      expect(response.status).toBe(201);

      // Check invoice status
      const invoiceResponse = await request(app)
        .get(`/api/invoices/${invoice.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(invoiceResponse.body.data.status).toBe("PAID");
      expect(invoiceResponse.body.data.paidAmount).toBe(5000);
      expect(invoiceResponse.body.data.balance).toBe(0);
    });

    it("should reject overpayment", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({
        customerId: customer.id,
        totalAmount: 5000,
        status: "PENDING",
      });

      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 6000, // More than invoice total
          paymentMethod: "CASH",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("exceeds");
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should validate payment amount", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({
        customerId: customer.id,
      });

      // Zero amount
      const zeroResponse = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: 0,
          paymentMethod: "CASH",
        });

      expect(zeroResponse.status).toBe(400);

      // Negative amount
      const negativeResponse = await request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          invoiceId: invoice.id,
          amount: -100,
          paymentMethod: "CASH",
        });

      expect(negativeResponse.status).toBe(400);
    });
  });

  describe("GET /api/payments", () => {
    it("should list all payments", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({ customerId: customer.id });

      // Create multiple payments
      await prisma.payment.createMany({
        data: [
          {
            invoiceId: invoice.id,
            amount: 1000,
            paymentMethod: "CASH",
            paymentDate: new Date(),
          },
          {
            invoiceId: invoice.id,
            amount: 2000,
            paymentMethod: "BANK_TRANSFER",
            paymentDate: new Date(),
          },
        ],
      });

      const response = await request(app)
        .get("/api/payments")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("should filter payments by invoice", async () => {
      const customer = await factory.customers.create();
      const invoice1 = await factory.invoices.create({ customerId: customer.id });
      const invoice2 = await factory.invoices.create({ customerId: customer.id });

      await prisma.payment.create({
        data: {
          invoiceId: invoice1.id,
          amount: 1000,
          paymentMethod: "CASH",
          paymentDate: new Date(),
        },
      });

      await prisma.payment.create({
        data: {
          invoiceId: invoice2.id,
          amount: 2000,
          paymentMethod: "CASH",
          paymentDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/payments?invoiceId=${invoice1.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].invoiceId).toBe(invoice1.id);
    });

    it("should paginate payment results", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({ customerId: customer.id });

      // Create 15 payments
      for (let i = 0; i < 15; i++) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: 100 * (i + 1),
            paymentMethod: "CASH",
            paymentDate: new Date(),
          },
        });
      }

      const response = await request(app)
        .get("/api/payments?page=1&limit=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
    });
  });

  describe("GET /api/payments/:id", () => {
    it("should get payment by ID", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.create({ customerId: customer.id });

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 1000,
          paymentMethod: "CASH",
          paymentDate: new Date(),
        },
      });

      const response = await request(app)
        .get(`/api/payments/${payment.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(payment.id);
      expect(response.body.data).toHaveProperty("invoice");
    });

    it("should return 404 for non-existent payment", async () => {
      const response = await request(app)
        .get("/api/payments/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/payments/:id/refund", () => {
    it("should process a refund", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.createPaid({
        customerId: customer.id,
        totalAmount: 5000,
      });

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: "BANK_TRANSFER",
          paymentDate: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/payments/${payment.id}/refund`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 5000,
          reason: "Duplicate payment",
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("refundId");
    });

    it("should handle partial refunds", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.createPaid({
        customerId: customer.id,
        totalAmount: 5000,
      });

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: "BANK_TRANSFER",
          paymentDate: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/payments/${payment.id}/refund`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 2000, // Partial refund
          reason: "Partial return",
        });

      expect(response.status).toBe(200);
      expect(response.body.data.refundAmount).toBe(2000);
    });

    it("should not allow refund exceeding payment amount", async () => {
      const customer = await factory.customers.create();
      const invoice = await factory.invoices.createPaid({
        customerId: customer.id,
        totalAmount: 5000,
      });

      const payment = await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 5000,
          paymentMethod: "CASH",
          paymentDate: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/payments/${payment.id}/refund`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          amount: 6000, // More than payment
          reason: "Test refund",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("exceeds");
    });
  });

  describe("Payment Authorization", () => {
    it("should reject requests without token", async () => {
      const response = await request(app).get("/api/payments");

      expect(response.status).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/payments")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
    });
  });
});
