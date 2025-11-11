import { validateEmail, validatePhone, formatCurrency, generateInvoiceNumber } from "../../../backend/src/utils/validators";

/**
 * Unit Tests: Validator Utilities
 */

describe("Validator Utilities", () => {
  describe("validateEmail", () => {
    it("should validate correct email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "first+last@company.com",
        "admin@clynepapers.com",
      ];

      validEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    it("should reject invalid email formats", () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
        "user@.com",
      ];

      invalidEmails.forEach((email) => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    it("should handle edge cases", () => {
      expect(validateEmail("")).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
    });
  });

  describe("validatePhone", () => {
    it("should validate Nigerian phone numbers", () => {
      const validPhones = [
        "+2348012345678",
        "+234 801 234 5678",
        "08012345678",
        "2348012345678",
      ];

      validPhones.forEach((phone) => {
        expect(validatePhone(phone)).toBe(true);
      });
    });

    it("should reject invalid phone numbers", () => {
      const invalidPhones = [
        "123",
        "+1234567890", // Not Nigerian
        "abc123",
        "",
      ];

      invalidPhones.forEach((phone) => {
        expect(validatePhone(phone)).toBe(false);
      });
    });

    it("should handle null and undefined", () => {
      expect(validatePhone(null)).toBe(false);
      expect(validatePhone(undefined)).toBe(false);
    });
  });

  describe("formatCurrency", () => {
    it("should format NGN currency correctly", () => {
      expect(formatCurrency(1000)).toBe("₦1,000.00");
      expect(formatCurrency(1000000)).toBe("₦1,000,000.00");
      expect(formatCurrency(99.99)).toBe("₦99.99");
    });

    it("should handle zero and negative amounts", () => {
      expect(formatCurrency(0)).toBe("₦0.00");
      expect(formatCurrency(-500)).toBe("-₦500.00");
    });

    it("should handle decimal places", () => {
      expect(formatCurrency(1000.5)).toBe("₦1,000.50");
      expect(formatCurrency(1000.123)).toBe("₦1,000.12"); // Rounds down
      expect(formatCurrency(1000.999)).toBe("₦1,001.00"); // Rounds up
    });

    it("should handle other currencies", () => {
      expect(formatCurrency(1000, "USD")).toBe("$1,000.00");
      expect(formatCurrency(1000, "EUR")).toBe("€1,000.00");
    });
  });

  describe("generateInvoiceNumber", () => {
    it("should generate valid invoice numbers", () => {
      const invoiceNumber = generateInvoiceNumber();
      
      expect(invoiceNumber).toMatch(/^INV-\d+$/);
      expect(invoiceNumber.length).toBeGreaterThan(8);
    });

    it("should generate unique invoice numbers", () => {
      const numbers = new Set();
      
      for (let i = 0; i < 100; i++) {
        numbers.add(generateInvoiceNumber());
      }
      
      expect(numbers.size).toBe(100); // All unique
    });

    it("should accept prefix parameter", () => {
      const number = generateInvoiceNumber("TEST");
      expect(number).toMatch(/^TEST-\d+$/);
    });

    it("should include location code if provided", () => {
      const number = generateInvoiceNumber("INV", "LOS");
      expect(number).toMatch(/^INV-LOS-\d+$/);
    });
  });
});

/**
 * Unit Tests: String Utilities
 */

describe("String Utilities", () => {
  const { slugify, capitalize, truncate } = require("../../../backend/src/utils/string");

  describe("slugify", () => {
    it("should convert strings to slugs", () => {
      expect(slugify("Hello World")).toBe("hello-world");
      expect(slugify("Test Product Name")).toBe("test-product-name");
      expect(slugify("Special!@# Characters")).toBe("special-characters");
    });

    it("should handle edge cases", () => {
      expect(slugify("")).toBe("");
      expect(slugify("   spaces   ")).toBe("spaces");
      expect(slugify("multiple---dashes")).toBe("multiple-dashes");
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
      expect(capitalize("test")).toBe("Test");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle already capitalized strings", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      const longText = "This is a very long text that needs to be truncated";
      expect(truncate(longText, 20)).toBe("This is a very lo...");
    });

    it("should not truncate short strings", () => {
      const shortText = "Short";
      expect(truncate(shortText, 20)).toBe("Short");
    });

    it("should handle exact length", () => {
      const text = "Exact length";
      expect(truncate(text, 12)).toBe("Exact length");
    });
  });
});

/**
 * Unit Tests: Date Utilities
 */

describe("Date Utilities", () => {
  const { formatDate, isOverdue, addDays, daysBetween } = require("../../../backend/src/utils/date");

  describe("formatDate", () => {
    it("should format dates correctly", () => {
      const date = new Date("2025-01-15");
      expect(formatDate(date)).toMatch(/15.*Jan.*2025/);
    });

    it("should handle different formats", () => {
      const date = new Date("2025-01-15");
      expect(formatDate(date, "YYYY-MM-DD")).toBe("2025-01-15");
      expect(formatDate(date, "DD/MM/YYYY")).toBe("15/01/2025");
    });
  });

  describe("isOverdue", () => {
    it("should detect overdue dates", () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(isOverdue(pastDate)).toBe(true);
    });

    it("should not flag future dates as overdue", () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(isOverdue(futureDate)).toBe(false);
    });

    it("should handle today's date", () => {
      const today = new Date();
      // Depends on business logic - typically today is not overdue
      expect(isOverdue(today)).toBe(false);
    });
  });

  describe("addDays", () => {
    it("should add days to a date", () => {
      const date = new Date("2025-01-01");
      const newDate = addDays(date, 10);
      
      expect(newDate.getDate()).toBe(11);
    });

    it("should subtract days with negative input", () => {
      const date = new Date("2025-01-15");
      const newDate = addDays(date, -5);
      
      expect(newDate.getDate()).toBe(10);
    });
  });

  describe("daysBetween", () => {
    it("should calculate days between dates", () => {
      const date1 = new Date("2025-01-01");
      const date2 = new Date("2025-01-10");
      
      expect(daysBetween(date1, date2)).toBe(9);
    });

    it("should handle reversed dates", () => {
      const date1 = new Date("2025-01-10");
      const date2 = new Date("2025-01-01");
      
      expect(Math.abs(daysBetween(date1, date2))).toBe(9);
    });
  });
});

/**
 * Unit Tests: Calculation Utilities
 */

describe("Calculation Utilities", () => {
  const { calculateTotal, calculateDiscount, calculateTax, roundCurrency } = require("../../../backend/src/utils/calculations");

  describe("calculateTotal", () => {
    it("should calculate invoice total from line items", () => {
      const items = [
        { quantity: 10, unitPrice: 100 },
        { quantity: 5, unitPrice: 200 },
      ];
      
      expect(calculateTotal(items)).toBe(2000); // 1000 + 1000
    });

    it("should handle empty arrays", () => {
      expect(calculateTotal([])).toBe(0);
    });

    it("should handle decimal quantities and prices", () => {
      const items = [
        { quantity: 2.5, unitPrice: 100.50 },
      ];
      
      expect(calculateTotal(items)).toBeCloseTo(251.25, 2);
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate percentage discount", () => {
      expect(calculateDiscount(1000, 10)).toBe(100); // 10% of 1000
      expect(calculateDiscount(5000, 25)).toBe(1250); // 25% of 5000
    });

    it("should handle zero discount", () => {
      expect(calculateDiscount(1000, 0)).toBe(0);
    });

    it("should handle 100% discount", () => {
      expect(calculateDiscount(1000, 100)).toBe(1000);
    });
  });

  describe("calculateTax", () => {
    it("should calculate tax amount", () => {
      expect(calculateTax(1000, 7.5)).toBe(75); // 7.5% VAT
    });

    it("should handle zero tax rate", () => {
      expect(calculateTax(1000, 0)).toBe(0);
    });
  });

  describe("roundCurrency", () => {
    it("should round to 2 decimal places", () => {
      expect(roundCurrency(10.123)).toBe(10.12);
      expect(roundCurrency(10.126)).toBe(10.13);
    });

    it("should handle whole numbers", () => {
      expect(roundCurrency(10)).toBe(10.00);
    });
  });
});
