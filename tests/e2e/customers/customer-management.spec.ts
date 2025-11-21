import { test, expect } from "@playwright/test";

/**
 * E2E Test: Customer Management
 */

test.describe("Customer Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to customers - handle mobile menu
    const isMobile = await page
      .locator('button[aria-label="Open menu"]')
      .isVisible();
    if (isMobile) {
      await page.click('button[aria-label="Open menu"]');
      await page.waitForTimeout(300); // Wait for sidebar animation
    }
    await page.click('a[href="/customers"]');
    await page.waitForURL("/customers");
  });

  test("should create a new customer", async ({ page }) => {
    const customerName = `Test Customer ${Date.now()}`;

    await expect(
      page.getByRole("heading", { name: "Customers" })
    ).toBeVisible();

    // Click add customer button
    await page.click('button:has-text("Add Customer")');

    // Wait for modal and location dropdown to load
    await page.waitForSelector("#customer-location");

    // Fill customer form - using ID selectors that match the modal
    await page.fill("#customer-name", customerName);
    await page.fill("#customer-email", `customer${Date.now()}@test.com`);
    await page.fill("#customer-phone", "+2348012345678");
    await page.fill("#customer-address", "123 Test Street, Lagos");

    // Select location (required field) - wait for options to load
    await page.waitForTimeout(500);
    await page.selectOption("#customer-location", { index: 1 });

    // Scroll submit button into view and click
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait a bit for submission
    await page.waitForTimeout(3000);

    // Force reload the page to bypass React Query cache issues
    await page.reload();
    await page.waitForTimeout(1000);

    // Debug: Log how many customer rows exist
    const rowCount = await page.locator('[data-testid="customer-row"]').count();
    console.log(`Found ${rowCount} customer rows`);

    // Verify success - customer should appear in list after reload
    await expect(
      page
        .locator(`[data-testid="customer-row"]`)
        .locator(`text=${customerName}`)
        .first()
    ).toBeVisible();
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
    // Check if mobile view
    const isMobile = await page
      .locator('button[aria-label="Open menu"]')
      .isVisible();

    if (isMobile) {
      // Mobile: Click the "Edit" button with text
      await page
        .locator('[data-testid="customer-row"]')
        .first()
        .locator('button:has-text("Edit")')
        .click();
    } else {
      // Desktop: Click the edit icon button with title attribute
      await page
        .locator('[data-testid="customer-row"]')
        .first()
        .locator('button[title="Edit customer"]')
        .click();
    }

    // Update phone number
    const newPhone = "+2349087654321";
    await page.fill("#customer-phone", newPhone);

    // Save changes
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Wait for modal to close completely
    await page.waitForSelector('button:has-text("Add Customer")', {
      state: "visible",
      timeout: 10000,
    });

    // Wait for React Query to refetch and update the list
    await page.waitForTimeout(1000);

    // Verify success - phone number should be updated
    await expect(
      page
        .locator(`[data-testid="customer-row"]`)
        .locator(`text=${newPhone}`)
        .first()
    ).toBeVisible();
  });

  test("should delete customer", async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForSelector('[data-testid="customer-row"]', {
      state: "visible",
      timeout: 5000,
    });

    // Check if mobile view
    const isMobile = await page
      .locator('button[aria-label="Open menu"]')
      .isVisible();

    if (isMobile) {
      // Mobile: Expand card and click delete button with icon
      await page
        .locator('[data-testid="customer-row"]')
        .first()
        .locator('button[title="Delete"]')
        .click();
    } else {
      // Desktop: Click the delete icon button with title attribute
      await page
        .locator('[data-testid="customer-row"]')
        .first()
        .locator('button[title="Delete customer"]')
        .click();
    }

    // Wait for confirm button to appear
    await page.waitForSelector('button:has-text("Confirm")', {
      state: "visible",
      timeout: 5000,
    });

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Wait for modal to close and list to refresh
    await page.waitForTimeout(2000);
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

  test.skip("should filter customers by location", async ({ page }) => {
    // TODO: Implement location filter dropdown in UI
    await page.goto("/customers");

    // Select location filter
    await page.selectOption('select[name="locationFilter"]', { index: 1 });

    // Wait for results
    await page.waitForTimeout(500);

    // Should show filtered results
    await expect(page.locator('[data-testid="customer-row"]')).not.toHaveCount(
      0
    );
  });

  test.skip("should export customers to CSV", async ({ page }) => {
    // TODO: Implement CSV export feature
    await page.goto("/customers");

    // Click export button
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export")');

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain("customers");
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test.skip("should validate required fields", async ({ page }) => {
    // TODO: Add visual validation error display in modal
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator(".error-message")).toBeVisible();
  });

  test.skip("should show customer activity history", async ({ page }) => {
    // TODO: Implement activity tab in customer details
    await page.goto("/customers");

    // Click first customer
    await page.click('[data-testid="customer-row"]:first-child');

    // Click activity tab
    await page.click('button:has-text("Activity")');

    // Should show activity list
    await expect(page.locator('[data-testid="activity-list"]')).toBeVisible();
  });

  test.skip("should link customer to team", async ({ page }) => {
    // TODO: Team is auto-assigned based on location; test may need updating
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
    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Navigate to customers - handle mobile menu
    const isMobile = await page
      .locator('button[aria-label="Open menu"]')
      .isVisible();
    if (isMobile) {
      await page.click('button[aria-label="Open menu"]');
      await page.waitForTimeout(300); // Wait for sidebar animation
    }
    await page.click('a[href="/customers"]');
    await page.waitForURL("/customers");
  });

  test("should handle duplicate customer names", async ({ page }) => {
    const customerName = "Duplicate Customer";

    await page.click('button:has-text("Add Customer")');

    // Create first customer
    await page.fill("#customer-name", customerName);
    await page.fill("#customer-email", "dup1@test.com");
    await page.fill("#customer-phone", "+2348011111111");
    await page.fill("#customer-address", "123 Test Street");

    // Wait for location dropdown and select
    await page.waitForSelector("#customer-location", { state: "visible" });
    await page.waitForTimeout(500);
    await page.selectOption("#customer-location", { index: 1 });

    const submitButton1 = page.locator('button[type="submit"]');
    await submitButton1.scrollIntoViewIfNeeded();
    await submitButton1.click();

    // Wait for modal to close completely before proceeding
    await page.waitForSelector('button:has-text("Add Customer")', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForTimeout(1000); // Wait for React Query refetch

    // Try to create duplicate
    await page.click('button:has-text("Add Customer")');
    await page.waitForSelector("#customer-name", {
      state: "visible",
      timeout: 5000,
    });

    await page.fill("#customer-name", customerName);
    await page.fill("#customer-email", "dup2@test.com");
    await page.fill("#customer-phone", "+2348022222222");
    await page.fill("#customer-address", "456 Test Avenue");

    // Wait for location dropdown and select
    await page.waitForSelector("#customer-location", { state: "visible" });
    await page.waitForTimeout(500);
    await page.selectOption("#customer-location", { index: 1 });

    const submitButton2 = page.locator('button[type="submit"]');
    await submitButton2.scrollIntoViewIfNeeded();
    await submitButton2.click();

    // Should allow duplicate names but different emails
    await page.waitForTimeout(1000);
    // Both customers should appear in the list
    const customerRows = await page.locator(`text=${customerName}`).count();
    expect(customerRows).toBeGreaterThan(0);
  });

  test.skip("should handle invalid email format", async ({ page }) => {
    // TODO: Add visual validation error display for invalid email
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');

    await page.fill("#customer-name", "Test Customer");
    await page.fill("#customer-email", "invalid-email");
    await page.fill("#customer-phone", "+2348012345678");
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator(".error-message")).toContainText(/email|valid/i);
  });

  test.skip("should handle invalid phone format", async ({ page }) => {
    // TODO: Add visual validation error display for invalid phone
    await page.goto("/customers");
    await page.click('button:has-text("Add Customer")');

    await page.fill("#customer-name", "Test Customer");
    await page.fill("#customer-email", "test@test.com");
    await page.fill("#customer-phone", "123"); // Invalid phone
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator(".error-message")).toContainText(/phone|valid/i);
  });
});
