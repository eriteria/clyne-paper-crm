import { test, expect, Page } from "@playwright/test";

/**
 * E2E Test: Complete Invoice Lifecycle
 * Tests the full workflow: Login → Create Customer → Create Invoice → Send Invoice → Mark as Paid
 */

test.describe("Invoice Lifecycle E2E", () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test("complete invoice lifecycle from creation to payment", async () => {
    // Step 1: Login
    await test.step("Login as admin", async () => {
      await page.goto("/login");
      await expect(page).toHaveTitle(/Login/i);

      await page.fill('input[name="email"]', "admin@clynepapers.com");
      await page.fill('input[name="password"]', "admin123");
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL("/dashboard");
      await expect(page).toHaveURL("/dashboard");
    });

    // Step 2: Navigate to Customers
    await test.step("Navigate to customers page", async () => {
      await page.click('a[href="/customers"]');
      await page.waitForURL("/customers");
      await expect(page.locator("h1")).toContainText("Customers");
    });

    // Step 3: Create a new customer
    const customerName = `Test Customer ${Date.now()}`;
    await test.step("Create new customer", async () => {
      await page.click('button:has-text("Add Customer")');

      // Fill customer form
      await page.fill('input[name="name"]', customerName);
      await page.fill('input[name="email"]', `customer${Date.now()}@test.com`);
      await page.fill('input[name="phone"]', "+2348012345678");
      await page.fill('input[name="address"]', "123 Test Street");

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for success message
      await expect(page.locator(".toast-success")).toBeVisible({
        timeout: 5000,
      });

      // Verify customer appears in list
      await expect(page.locator(`text=${customerName}`)).toBeVisible();
    });

    // Step 4: Navigate to Invoices
    await test.step("Navigate to invoices page", async () => {
      await page.click('a[href="/invoices"]');
      await page.waitForURL("/invoices");
      await expect(page.locator("h1")).toContainText("Invoices");
    });

    // Step 5: Create invoice
    let invoiceNumber: string;
    await test.step("Create new invoice", async () => {
      await page.click('button:has-text("Create Invoice")');

      // Select customer
      await page.click('select[name="customerId"]');
      await page.selectOption('select[name="customerId"]', {
        label: customerName,
      });

      // Add line item
      await page.click('button:has-text("Add Item")');

      // Fill first line item
      await page.fill('input[name="items.0.description"]', "Tissue Paper - Premium");
      await page.fill('input[name="items.0.quantity"]', "100");
      await page.fill('input[name="items.0.unitPrice"]', "50");

      // Verify total calculation
      const totalElement = page.locator('[data-testid="invoice-total"]');
      await expect(totalElement).toContainText("5,000");

      // Set due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      await page.fill(
        'input[name="dueDate"]',
        dueDate.toISOString().split("T")[0]
      );

      // Submit invoice
      await page.click('button[type="submit"]:has-text("Create Invoice")');

      // Wait for success and capture invoice number
      await expect(page.locator(".toast-success")).toBeVisible();
      
      const invoiceNumberElement = page.locator('[data-testid="invoice-number"]');
      invoiceNumber = await invoiceNumberElement.textContent() || "";
      
      expect(invoiceNumber).toMatch(/INV-\d+/);
    });

    // Step 6: View invoice details
    await test.step("View invoice details", async () => {
      await page.click(`text=${invoiceNumber}`);

      // Wait for invoice detail page
      await expect(page.locator("h1")).toContainText(invoiceNumber);

      // Verify invoice details
      await expect(page.locator(`text=${customerName}`)).toBeVisible();
      await expect(page.locator("text=Tissue Paper - Premium")).toBeVisible();
      await expect(page.locator("text=100")).toBeVisible(); // Quantity
      await expect(page.locator("text=5,000")).toBeVisible(); // Total
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText(
        "PENDING"
      );
    });

    // Step 7: Send invoice (email mock)
    await test.step("Send invoice via email", async () => {
      await page.click('button:has-text("Send Invoice")');

      // Confirm send dialog
      await page.click('button:has-text("Confirm")');

      // Wait for success message
      await expect(page.locator(".toast-success")).toBeVisible();
      await expect(page.locator(".toast-success")).toContainText("sent");

      // Verify status updated
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText(
        "SENT"
      );
    });

    // Step 8: Record payment
    await test.step("Mark invoice as paid", async () => {
      await page.click('button:has-text("Record Payment")');

      // Fill payment form
      await page.selectOption('select[name="paymentMethod"]', "BANK_TRANSFER");
      await page.fill('input[name="amount"]', "5000");
      await page.fill(
        'input[name="transactionReference"]',
        `TXN-${Date.now()}`
      );

      // Submit payment
      await page.click('button[type="submit"]:has-text("Record Payment")');

      // Wait for success
      await expect(page.locator(".toast-success")).toBeVisible();

      // Verify status changed to PAID
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText(
        "PAID"
      );

      // Verify payment appears in payment history
      await expect(page.locator("text=BANK_TRANSFER")).toBeVisible();
      await expect(page.locator("text=5,000.00")).toBeVisible();
    });

    // Step 9: Verify invoice in list
    await test.step("Verify invoice appears in paid invoices", async () => {
      await page.click('a[href="/invoices"]');
      await page.waitForURL("/invoices");

      // Filter by PAID status
      await page.selectOption('select[name="statusFilter"]', "PAID");

      // Verify invoice appears
      await expect(page.locator(`text=${invoiceNumber}`)).toBeVisible();
      await expect(page.locator(`text=${customerName}`)).toBeVisible();
    });

    // Step 10: View reporting/dashboard
    await test.step("Verify invoice reflects in dashboard metrics", async () => {
      await page.click('a[href="/dashboard"]');
      await page.waitForURL("/dashboard");

      // Check that metrics have updated (total sales, paid invoices count)
      const totalSales = page.locator('[data-testid="total-sales"]');
      await expect(totalSales).toBeVisible();

      // Verify paid invoices count increased
      const paidInvoicesCount = page.locator(
        '[data-testid="paid-invoices-count"]'
      );
      await expect(paidInvoicesCount).toBeVisible();
    });
  });

  test("handle invoice with partial payment", async () => {
    await test.step("Login", async () => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "admin@clynepapers.com");
      await page.fill('input[name="password"]', "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard");
    });

    // Create customer and invoice (abbreviated)
    const customerName = `Test Customer ${Date.now()}`;
    await test.step("Create customer and invoice", async () => {
      // Create customer
      await page.goto("/customers");
      await page.click('button:has-text("Add Customer")');
      await page.fill('input[name="name"]', customerName);
      await page.fill('input[name="email"]', `customer${Date.now()}@test.com`);
      await page.fill('input[name="phone"]', "+2348012345678");
      await page.click('button[type="submit"]');
      await expect(page.locator(".toast-success")).toBeVisible();

      // Create invoice
      await page.goto("/invoices");
      await page.click('button:has-text("Create Invoice")');
      await page.selectOption('select[name="customerId"]', { label: customerName });
      await page.click('button:has-text("Add Item")');
      await page.fill('input[name="items.0.description"]', "Test Item");
      await page.fill('input[name="items.0.quantity"]', "10");
      await page.fill('input[name="items.0.unitPrice"]', "1000");
      await page.click('button[type="submit"]:has-text("Create Invoice")');
      await expect(page.locator(".toast-success")).toBeVisible();
    });

    // Make partial payment
    await test.step("Make partial payment", async () => {
      await page.click('button:has-text("Record Payment")');
      await page.selectOption('select[name="paymentMethod"]', "CASH");
      await page.fill('input[name="amount"]', "5000"); // Half of 10,000
      await page.click('button[type="submit"]:has-text("Record Payment")');
      await expect(page.locator(".toast-success")).toBeVisible();

      // Verify status is PARTIALLY_PAID
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText(
        "PARTIALLY_PAID"
      );

      // Verify remaining balance
      await expect(page.locator('[data-testid="remaining-balance"]')).toContainText(
        "5,000"
      );
    });

    // Complete payment
    await test.step("Complete remaining payment", async () => {
      await page.click('button:has-text("Record Payment")');
      await page.selectOption('select[name="paymentMethod"]', "BANK_TRANSFER");
      await page.fill('input[name="amount"]', "5000");
      await page.click('button[type="submit"]:has-text("Record Payment")');
      await expect(page.locator(".toast-success")).toBeVisible();

      // Verify status is now PAID
      await expect(page.locator('[data-testid="invoice-status"]')).toContainText(
        "PAID"
      );

      // Verify no remaining balance
      await expect(page.locator('[data-testid="remaining-balance"]')).toContainText(
        "0"
      );
    });
  });

  test("handle invoice validation errors", async () => {
    await test.step("Login", async () => {
      await page.goto("/login");
      await page.fill('input[name="email"]', "admin@clynepapers.com");
      await page.fill('input[name="password"]', "admin123");
      await page.click('button[type="submit"]');
      await page.waitForURL("/dashboard");
    });

    await test.step("Try to create invoice without customer", async () => {
      await page.goto("/invoices");
      await page.click('button:has-text("Create Invoice")');

      // Try to submit without selecting customer
      await page.click('button[type="submit"]:has-text("Create Invoice")');

      // Expect validation error
      await expect(page.locator(".error-message")).toContainText("required");
    });

    await test.step("Try to create invoice with zero amount", async () => {
      // Add item with zero quantity
      await page.click('button:has-text("Add Item")');
      await page.fill('input[name="items.0.quantity"]', "0");
      await page.fill('input[name="items.0.unitPrice"]', "100");

      await page.click('button[type="submit"]:has-text("Create Invoice")');

      // Expect validation error
      await expect(page.locator(".error-message")).toContainText("greater than");
    });

    await test.step("Try to create invoice with negative price", async () => {
      await page.fill('input[name="items.0.quantity"]', "10");
      await page.fill('input[name="items.0.unitPrice"]', "-100");

      await page.click('button[type="submit"]:has-text("Create Invoice")');

      // Expect validation error
      await expect(page.locator(".error-message")).toContainText("positive");
    });
  });
});
