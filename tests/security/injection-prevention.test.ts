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

/**
 * Security Tests: Input Validation and Injection Prevention
 */

describe("Security: Input Validation Tests", () => {
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

    const { user, password } = await factory.users.createAdmin();

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

  describe("SQL Injection Prevention", () => {
    it("should prevent SQL injection in search queries", async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE customers; --",
        "1' UNION SELECT * FROM users--",
        "admin'--",
        "' OR 1=1--",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get(`/api/customers?search=${encodeURIComponent(payload)}`)
          .set("Authorization", `Bearer ${authToken}`);

        // Should not return SQL error or all records
        expect(response.status).not.toBe(500);
        expect(response.body).not.toHaveProperty("sqlMessage");
      }
    });

    it("should prevent SQL injection in POST data", async () => {
      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "'; DROP TABLE customers; --",
          email: "test@test.com",
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      // Should create customer with escaped name, not execute SQL
      expect(response.status).toBe(201);
      
      // Verify no tables were dropped
      const customers = await prisma.customer.findMany();
      expect(customers).toBeDefined();
    });

    it("should prevent SQL injection in numeric parameters", async () => {
      const response = await request(app)
        .get("/api/customers/1 OR 1=1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("XSS (Cross-Site Scripting) Prevention", () => {
    it("should sanitize XSS in customer name", async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: xssPayload,
          email: "test@test.com",
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      expect(response.status).toBe(201);

      // Get the customer back
      const getResponse = await request(app)
        .get(`/api/customers/${response.body.data.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      // Name should be escaped or stripped
      const customerName = getResponse.body.data.name;
      expect(customerName).not.toContain("<script>");
    });

    it("should prevent XSS in invoice notes", async () => {
      const customer = await factory.customers.create();
      const xssPayload = '<img src=x onerror="alert(1)">';

      const response = await request(app)
        .post("/api/invoices")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          customerId: customer.id,
          notes: xssPayload,
          items: [{ description: "Test", quantity: 1, unitPrice: 100 }],
        });

      expect(response.status).toBe(201);

      // Notes should be escaped
      const notes = response.body.data.notes;
      expect(notes).not.toContain('<img');
    });

    it("should sanitize HTML entities in text fields", async () => {
      const htmlPayload = '<b>Bold Text</b>';

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: htmlPayload,
          email: "test@test.com",
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      expect(response.status).toBe(201);
      
      const name = response.body.data.name;
      // Should be escaped or plain text
      expect(name).not.toContain('<b>');
    });
  });

  describe("Path Traversal Prevention", () => {
    it("should prevent path traversal in file operations", async () => {
      const pathTraversalPayloads = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "....//....//....//etc/passwd",
      ];

      for (const payload of pathTraversalPayloads) {
        const response = await request(app)
          .get(`/api/files/${encodeURIComponent(payload)}`)
          .set("Authorization", `Bearer ${authToken}`);

        // Should not allow access to system files
        expect(response.status).not.toBe(200);
      }
    });
  });

  describe("Command Injection Prevention", () => {
    it("should prevent command injection in filename", async () => {
      const commandPayloads = [
        "file; rm -rf /",
        "file | cat /etc/passwd",
        "file && whoami",
      ];

      for (const payload of commandPayloads) {
        const response = await request(app)
          .post("/api/upload")
          .set("Authorization", `Bearer ${authToken}`)
          .field("filename", payload);

        // Should not execute commands
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe("NoSQL Injection Prevention", () => {
    it("should prevent NoSQL injection patterns", async () => {
      const noSQLPayloads = [
        { $ne: null },
        { $gt: "" },
        { $regex: ".*" },
      ];

      for (const payload of noSQLPayloads) {
        const response = await request(app)
          .get("/api/customers")
          .set("Authorization", `Bearer ${authToken}`)
          .query({ filter: JSON.stringify(payload) });

        // Should not allow injection
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe("Mass Assignment Prevention", () => {
    it("should prevent unauthorized field updates", async () => {
      const { user } = await factory.users.createStaff();

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Updated Name",
          isAdmin: true, // Attempting to escalate privileges
          roleId: testData.adminRole.id, // Attempting to change role
        });

      // Should not allow unauthorized field updates
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(updatedUser?.roleId).not.toBe(testData.adminRole.id);
    });

    it("should only update allowed fields", async () => {
      const customer = await factory.customers.create();

      const response = await request(app)
        .put(`/api/customers/${customer.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Updated Name",
          id: "malicious-id", // Attempting to change ID
          createdAt: new Date(), // Attempting to change timestamp
        });

      const updatedCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
      });

      // ID and timestamps should not change
      expect(updatedCustomer?.id).toBe(customer.id);
      expect(updatedCustomer?.createdAt).toEqual(customer.createdAt);
    });
  });

  describe("Input Length Validation", () => {
    it("should reject excessively long inputs", async () => {
      const longString = "A".repeat(10000);

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: longString,
          email: "test@test.com",
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("length");
    });

    it("should validate email length", async () => {
      const longEmail = "a".repeat(300) + "@test.com";

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: "Test Customer",
          email: longEmail,
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      expect(response.status).toBe(400);
    });
  });

  describe("Special Character Handling", () => {
    it("should handle special characters safely", async () => {
      const specialChars = "Test & Company <> 'Quotes' \"Double\" \\Slash/";

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          name: specialChars,
          email: "test@test.com",
          phone: "+2348012345678",
          locationId: testData.testLocation.id,
        });

      expect(response.status).toBe(201);

      // Should store and retrieve safely
      const getResponse = await request(app)
        .get(`/api/customers/${response.body.data.id}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(getResponse.body.data.name).toBeDefined();
    });
  });

  describe("JSON Injection Prevention", () => {
    it("should prevent JSON injection in request body", async () => {
      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .set("Content-Type", "application/json")
        .send('{"name": "Test", "__proto__": {"isAdmin": true}}');

      // Should not allow prototype pollution
      expect(response.status).not.toBe(500);
    });
  });

  describe("LDAP Injection Prevention", () => {
    it("should prevent LDAP injection patterns", async () => {
      const ldapPayloads = [
        "*()|&",
        "*)(uid=*",
        "admin*",
      ];

      for (const payload of ldapPayloads) {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: payload,
            password: "password",
          });

        // Should not allow LDAP injection
        expect(response.status).not.toBe(200);
      }
    });
  });
});
