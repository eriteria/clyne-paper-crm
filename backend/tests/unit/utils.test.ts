import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Set test environment variables
process.env.JWT_SECRET = "test-jwt-secret-key";
// process.env.NODE_ENV = "test"; // Avoid assigning to NODE_ENV if it's read-only

describe("Authentication Utils Unit Tests", () => {
  describe("Password hashing", () => {
    it("should hash passwords correctly", async () => {
      const password = "testPassword123";
      const hashedPassword = await bcrypt.hash(password, 10);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[ayb]\$10\$/);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it("should reject wrong passwords", async () => {
      const password = "testPassword123";
      const wrongPassword = "wrongPassword";
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe("JWT Token generation", () => {
    it("should generate valid JWT tokens", () => {
      const payload = {
        userId: "user123",
        roleId: "role456",
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "1h",
      });

      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // Header.Payload.Signature
    });

    it("should verify JWT tokens correctly", () => {
      const payload = {
        userId: "user123",
        roleId: "role456",
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: "1h",
      });
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.roleId).toBe(payload.roleId);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it("should reject invalid JWT tokens", () => {
      const invalidToken = "invalid.jwt.token";

      expect(() => {
        jwt.verify(invalidToken, process.env.JWT_SECRET!);
      }).toThrow();
    });
  });

  describe("Input Validation", () => {
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    const validateNigerianPhone = (phone: string): boolean => {
      const phoneRegex = /^(\+234|234|0)[7-9][01]\d{8}$/;
      return phoneRegex.test(phone.replace(/\s+/g, ""));
    };

    describe("Email validation", () => {
      it("should validate correct email formats", () => {
        const validEmails = [
          "user@example.com",
          "test.email@domain.co.uk",
          "user+tag@example.org",
          "firstname.lastname@company.io",
        ];

        validEmails.forEach((email) => {
          expect(validateEmail(email)).toBe(true);
        });
      });

      it("should reject invalid email formats", () => {
        const invalidEmails = [
          "invalid-email",
          "@domain.com",
          "user@",
          "user@domain", // no TLD
          "",
        ];

        invalidEmails.forEach((email) => {
          expect(validateEmail(email)).toBe(false);
        });
      });
    });

    describe("Nigerian phone validation", () => {
      it("should validate correct Nigerian phone numbers", () => {
        const validPhones = [
          "+2348012345678",
          "2348012345678",
          "08012345678",
          "07012345678",
          "09012345678",
        ];

        validPhones.forEach((phone) => {
          expect(validateNigerianPhone(phone)).toBe(true);
        });
      });

      it("should reject invalid phone numbers", () => {
        const invalidPhones = [
          "1234567890",
          "+1234567890",
          "0801234567", // too short
          "080123456789", // too long
          "+23480123456", // incomplete
          "06012345678", // wrong prefix
          "",
        ];

        invalidPhones.forEach((phone) => {
          expect(validateNigerianPhone(phone)).toBe(false);
        });
      });
    });
  });
});
