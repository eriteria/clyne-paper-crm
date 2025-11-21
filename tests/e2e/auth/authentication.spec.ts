import { test, expect } from "@playwright/test";

/**
 * E2E Test: Authentication and Authorization
 */

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for redirect with increased timeout for slow loads
    await page.waitForURL("/dashboard", { timeout: 60000 });
    await expect(page).toHaveURL("/dashboard");

    // Verify user info is displayed
    await expect(page.locator('[data-testid="user-name"]')).toBeVisible();
  });
  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "invalid@test.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator(".error-message")).toBeVisible();
    await expect(page.locator(".error-message")).toContainText(
      /failed|401|unauthorized/i
    );

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Check if mobile view
    const isMobile = await page
      .locator('button[aria-label="Open menu"]')
      .isVisible();
    if (isMobile) {
      // Mobile: Open sidebar first
      await page.click('button[aria-label="Open menu"]');
      await page.waitForTimeout(300);
    }

    // Scroll user menu into view and click
    const userMenu = page.locator('[data-testid="user-menu"]');
    await userMenu.scrollIntoViewIfNeeded();
    await userMenu.click();
    await page.click('button:has-text("Sign out")');

    // Should redirect to login
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");

    // Should not be able to access protected routes
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test.skip("should handle session expiry", async ({ page, context }) => {
    // TODO: Implement session expiry detection and redirect
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Clear cookies to simulate expired session
    await context.clearCookies();

    // Try to navigate to protected route
    await page.goto("/customers");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test.skip("should validate form inputs", async ({ page }) => {
    // TODO: Add visual validation error display on login page
    await page.goto("/login");

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator(".error-message")).toBeVisible();
  });
});

test.describe("Role-Based Access Control", () => {
  test("admin should access all pages", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepaper.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");

    // Check access to admin pages
    await page.goto("/admin");
    await expect(page).not.toHaveURL("/login");
    await expect(
      page.getByRole("heading", { name: "Administration Panel" })
    ).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).not.toHaveURL("/login");

    await page.goto("/admin/roles");
    await expect(page).not.toHaveURL("/login");
  });

  test.skip("staff should not access admin pages", async ({ page }) => {
    // TODO: Implement staff user and access control testing
    // This test assumes a staff user exists
    // For demonstration, we'll test the redirect behavior

    await page.goto("/login");
    // In a real scenario, you'd login with staff credentials
    // For now, we'll test the redirect mechanism

    // Try to access admin page without permission
    await page.goto("/admin");

    // Should redirect or show error
    // The exact behavior depends on your implementation
    const hasError = await page
      .locator(".error-message")
      .isVisible()
      .catch(() => false);
    const isRedirected = page.url() !== new URL("/admin", page.url()).href;

    expect(hasError || isRedirected).toBeTruthy();
  });
});

test.describe("Password Reset", () => {
  test.skip("should show forgot password link", async ({ page }) => {
    // TODO: Implement forgot password feature
    await page.goto("/login");

    const forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    await expect(forgotPasswordLink).toBeVisible();
  });

  test.skip("should handle password reset request", async ({ page }) => {
    // TODO: Implement forgot password feature
    await page.goto("/login");
    await page.click('a:has-text("Forgot Password")');

    await expect(page).toHaveURL(/\/forgot-password/);

    await page.fill('input[name="email"]', "test@clynepapers.com");
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator(".success-message")).toBeVisible();
  });
});
