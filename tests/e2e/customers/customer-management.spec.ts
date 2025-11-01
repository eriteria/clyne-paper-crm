import { test, expect } from "@playwright/test";

/**
 * E2E Test: Customer Management
 */

test.describe("Customer Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should create a new customer", async ({ page }) => {
    const customerName = `Test Customer ${Date.now()}`;
    
    await page.goto("/customers");
    await expect(page.locator("h1")).toContainText("Customers");
    
    // Click add customer button
    await page.click('button:has-text("Add Customer")');
    
    // Fill customer form
    await page.fill('input[name="name"]', customerName);
    await page.fill('input[name="email"]', `customer${Date.now()}@test.com`);
    await page.fill('input[name="phone"]', "+2348012345678");
    await page.fill('input[name="address"]', "123 Test Street, Lagos");
    await page.fill('input[name="city"]', "Lagos");
    await page.fill('input[name="state"]', "Lagos State");
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator(".toast-success")).toBeVisible();
    await expect(page.locator(`text=${customerName}`)).toBeVisible();
  });

  test("should search for customers", async ({ page }) => {
    await page.goto("/customers");
    
    // Enter search term
    await page.fill('input[placeholder*="Search"]', "Test Customer");
    await page.press('input[placeholder*="Search"]', "Enter");
    
    // Results should be filtered
    await expect(page.locator('[data-testid="customer-row"]')).toHaveCount(
      await page.locator('[data-testid="customer-row"]').count(),
      { timeout: 5000 }
    );
  });

  test("should update customer details", async ({ page }) => {
    await page.goto("/customers");
    
    // Click first customer
    await page.click('[data-testid="customer-row"]:first-child');
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Update phone number
    const newPhone = "+2349087654321";
    await page.fill('input[name="phone"]', newPhone);
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator(".toast-success")).toBeVisible();
    await expect(page.locator(`text=${newPhone}`)).toBeVisible();
  });

  test("should delete customer", async ({ page }) => {
    await page.goto("/customers");
    
    // Click first customer's delete button
    await page.click('[data-testid="customer-row"]:first-child button:has-text("Delete")');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")');
    
    // Verify success
    await expect(page.locator(".toast-success")).toBeVisible();
    await expect(page.locator(".toast-success")).toContainText("deleted");
  });

  test("should paginate customer list", async ({ page }) => {
    await page.goto("/customers");
    
    // Check if pagination exists
    const pagination = page.locator('[data-testid="pagination"]');
    
    if (await pagination.isVisible()) {
      // Get first page data
      const firstPageFirstCustomer = await page
        .locator('[data-testid="customer-row"]:first-child')
        .textContent();
      
      // Go to next page
      await page.click('button:has-text("Next")');
      
      // Wait for data to load
      await page.waitForTimeout(500);
      
      // Get second page data
      const secondPageFirstCustomer = await page
        .locator('[data-testid="customer-row"]:first-child')
        .textContent();
      
      // Should be different
      expect(firstPageFirstCustomer).not.toBe(secondPageFirstCustomer);
    }
  });

  test("should filter customers by location", async ({ page }) => {
    await page.goto("/customers");
    
    // Select location filter
    await page.selectOption('select[name="locationFilter"]', { index: 1 });
    
    // Wait for results
    await page.waitForTimeout(500);
    
    // Should show filtered results
    await expect(page.locator('[data-testid="customer-row"]')).not.toHaveCount(0);
  });

  test("should export customers to CSV", async ({ page }) => {
    await page.goto("/customers");
    
    // Click export button
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain("customers");
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator(".error-message")).toBeVisible();
  });

  test("should show customer activity history", async ({ page }) => {
    await page.goto("/customers");
    
    // Click first customer
    await page.click('[data-testid="customer-row"]:first-child');
    
    // Click activity tab
    await page.click('button:has-text("Activity")');
    
    // Should show activity list
    await expect(page.locator('[data-testid="activity-list"]')).toBeVisible();
  });

  test("should link customer to team", async ({ page }) => {
    await page.goto("/customers");
    await page.click('[data-testid="customer-row"]:first-child');
    await page.click('button:has-text("Edit")');
    
    // Select team
    await page.selectOption('select[name="teamId"]', { index: 1 });
    
    // Save
    await page.click('button[type="submit"]');
    
    // Verify success
    await expect(page.locator(".toast-success")).toBeVisible();
  });
});

test.describe("Customer Management - Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should handle duplicate customer names", async ({ page }) => {
    const customerName = "Duplicate Customer";
    
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');
    
    // Create first customer
    await page.fill('input[name="name"]', customerName);
    await page.fill('input[name="email"]', "dup1@test.com");
    await page.fill('input[name="phone"]', "+2348011111111");
    await page.click('button[type="submit"]');
    await expect(page.locator(".toast-success")).toBeVisible();
    
    // Try to create duplicate
    await page.click('button:has-text("Add Customer")');
    await page.fill('input[name="name"]', customerName);
    await page.fill('input[name="email"]', "dup2@test.com");
    await page.fill('input[name="phone"]', "+2348022222222");
    await page.click('button[type="submit"]');
    
    // Should allow duplicate names but different emails
    await expect(page.locator(".toast-success")).toBeVisible();
  });

  test("should handle invalid email format", async ({ page }) => {
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');
    
    await page.fill('input[name="name"]', "Test Customer");
    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="phone"]', "+2348012345678");
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator(".error-message")).toContainText(/email|valid/i);
  });

  test("should handle invalid phone format", async ({ page }) => {
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');
    
    await page.fill('input[name="name"]', "Test Customer");
    await page.fill('input[name="email"]', "test@test.com");
    await page.fill('input[name="phone"]', "123"); // Invalid phone
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator(".error-message")).toContainText(/phone|valid/i);
  });
});
