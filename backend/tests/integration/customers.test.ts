import request from "supertest";
import { Express } from "express";
import { TestHelper } from "../utils/testHelper";
import { prisma } from "../setup";
import { createApp } from "../../src/app";

describe("Customers API Integration Tests", () => {
  let app: Express;
  let testHelper: TestHelper;
  let authToken: string;
  let testUser: any;
  let testLocation: any;
  let testTeam: any;

  beforeAll(async () => {
    app = createApp({ enableRateLimit: false });
    testHelper = new TestHelper(app);
  });

  beforeEach(async () => {
    // Create test data
    testLocation = await testHelper.createTestLocation({
      name: "Lagos Location",
      code: "LAG001",
    });

    testTeam = await testHelper.createTestTeam([testLocation.id], {
      name: "Lagos Sales Team",
    });

    const { user, password } = await testHelper.createTestUser({
      email: "sales@test.com",
      fullName: "Sales Rep",
      teamId: testTeam.id,
    });

    testUser = user;
    authToken = testHelper.generateAuthToken(user.id, user.roleId);
  });

  describe("POST /api/customers", () => {
    it("should create a new customer", async () => {
      const customerData = {
        name: "Test Customer Ltd",
        email: "customer@test.com",
        phone: "08012345678",
        address: "123 Test Street",
        city: "Lagos",
        state: "Lagos",
        customerType: "DISTRIBUTOR",
        locationId: testLocation.id,
      };

      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send(customerData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        customerType: customerData.customerType,
        locationId: testLocation.id,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.customerCode).toBeDefined();
    });

    it("should require authentication", async () => {
      const customerData = {
        name: "Test Customer",
        email: "test@test.com",
      };

      await request(app).post("/api/customers").send(customerData).expect(401);
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain("validation");
    });
  });

  describe("GET /api/customers", () => {
    beforeEach(async () => {
      // Create test customers
      await testHelper.createTestCustomer({
        name: "Customer 1",
        email: "customer1@test.com",
        locationId: testLocation.id,
      });

      await testHelper.createTestCustomer({
        name: "Customer 2",
        email: "customer2@test.com",
        locationId: testLocation.id,
      });
    });

    it("should get list of customers", async () => {
      const response = await request(app)
        .get("/api/customers")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toBeDefined();
      expect(Array.isArray(response.body.customers)).toBe(true);
      expect(response.body.customers.length).toBeGreaterThanOrEqual(2);
      expect(response.body.pagination).toBeDefined();
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/customers?page=1&limit=1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it("should support search", async () => {
      const response = await request(app)
        .get("/api/customers?search=Customer 1")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.customers).toHaveLength(1);
      expect(response.body.customers[0].name).toContain("Customer 1");
    });
  });

  describe("GET /api/customers/:id", () => {
    let testCustomer: any;

    beforeEach(async () => {
      testCustomer = await testHelper.createTestCustomer({
        name: "Single Customer",
        email: "single@test.com",
        locationId: testLocation.id,
      });
    });

    it("should get customer by ID", async () => {
      const response = await request(app)
        .get(`/api/customers/${testCustomer.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testCustomer.id);
      expect(response.body.name).toBe("Single Customer");
      expect(response.body.email).toBe("single@test.com");
    });

    it("should return 404 for non-existent customer", async () => {
      await request(app)
        .get("/api/customers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe("PUT /api/customers/:id", () => {
    let testCustomer: any;

    beforeEach(async () => {
      testCustomer = await testHelper.createTestCustomer({
        name: "Update Customer",
        email: "update@test.com",
        locationId: testLocation.id,
      });
    });

    it("should update customer", async () => {
      const updateData = {
        name: "Updated Customer Name",
        phone: "08087654321",
      };

      const response = await request(app)
        .put(`/api/customers/${testCustomer.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phone).toBe(updateData.phone);
      expect(response.body.email).toBe("update@test.com"); // unchanged
    });

    it("should return 404 for non-existent customer", async () => {
      await request(app)
        .put("/api/customers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ name: "Updated" })
        .expect(404);
    });
  });

  describe("DELETE /api/customers/:id", () => {
    let testCustomer: any;

    beforeEach(async () => {
      testCustomer = await testHelper.createTestCustomer({
        name: "Delete Customer",
        email: "delete@test.com",
        locationId: testLocation.id,
      });
    });

    it("should delete customer", async () => {
      await request(app)
        .delete(`/api/customers/${testCustomer.id}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(204);

      // Verify customer is deleted
      const deletedCustomer = await prisma.customer.findUnique({
        where: { id: testCustomer.id },
      });
      expect(deletedCustomer).toBeNull();
    });

    it("should return 404 for non-existent customer", async () => {
      await request(app)
        .delete("/api/customers/non-existent-id")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
