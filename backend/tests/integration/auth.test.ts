import request from "supertest";
import { Express } from "express";
import { TestHelper } from "../utils/testHelper";
import { prisma } from "../setup";

// We'll need to create an app factory function
import { createApp } from "../../src/app"; // We'll create this

describe("Auth API Integration Tests", () => {
  let app: Express;
  let testHelper: TestHelper;

  beforeAll(async () => {
    app = createApp({ enableRateLimit: false });
    testHelper = new TestHelper(app);
  });

  describe("POST /api/auth/login", () => {
    it("should login user with valid credentials", async () => {
      // Create test user
      const { user, password } = await testHelper.createTestUser({
        email: "test@example.com",
      });

      const response = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("refreshToken");
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user.email).toBe(user.email);
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Invalid credentials");
    });

    it("should validate required fields", async () => {
      const response = await request(app).post("/api/auth/login").send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("email and password");
    });

    it("should handle invalid email format", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "invalid-email",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh token with valid refresh token", async () => {
      // Login first to get refresh token
      const { user, password } = await testHelper.createTestUser();

      const loginResponse = await request(app).post("/api/auth/login").send({
        email: user.email,
        password,
      });

      const { refreshToken } = loginResponse.body.data;

      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("should reject invalid refresh token", async () => {
      const response = await request(app)
        .post("/api/auth/refresh")
        .send({ refreshToken: "invalid-token" });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/auth/profile", () => {
    it("should return user profile when authenticated", async () => {
      const auth = await testHelper.getAuthenticatedAgent();

      const response = await auth.get("/api/auth/profile");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data).toHaveProperty("email");
      expect(response.body.data).toHaveProperty("fullName");
      expect(response.body.data).toHaveProperty("role");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject requests with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});
