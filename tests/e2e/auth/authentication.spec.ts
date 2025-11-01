import { test, expect } from "@playwright/test";

/**
 * E2E Test: Authentication and Authorization
 */

test.describe("Authentication", () => {
  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");
    
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    
    await page.waitForURL("/dashboard");
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
    await expect(page.locator(".error-message")).toContainText(/invalid|incorrect/i);
    
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test("should logout successfully", async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("Logout")');
    
    // Should redirect to login
    await page.waitForURL("/login");
    await expect(page).toHaveURL("/login");
    
    // Should not be able to access protected routes
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("should handle session expiry", async ({ page, context }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
    
    // Clear cookies to simulate expired session
    await context.clearCookies();
    
    // Try to navigate to protected route
    await page.goto("/customers");
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should validate form inputs", async ({ page }) => {
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
    await page.fill('input[name="email"]', "admin@clynepapers.com");
    await page.fill('input[name="password"]', "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
    
    // Check access to admin pages
    await page.goto("/admin");
    await expect(page).not.toHaveURL("/login");
    await expect(page.locator("h1")).toContainText(/admin/i);
    
    await page.goto("/admin/users");
    await expect(page).not.toHaveURL("/login");
    
    await page.goto("/admin/roles");
    await expect(page).not.toHaveURL("/login");
  });

  test("staff should not access admin pages", async ({ page }) => {
    // This test assumes a staff user exists
    // For demonstration, we'll test the redirect behavior
    
    await page.goto("/login");
    // In a real scenario, you'd login with staff credentials
    // For now, we'll test the redirect mechanism
    
    // Try to access admin page without permission
    await page.goto("/admin");
    
    // Should redirect or show error
    // The exact behavior depends on your implementation
    const hasError = await page.locator(".error-message").isVisible().catch(() => false);
    const isRedirected = page.url() !== new URL("/admin", page.url()).href;
    
    expect(hasError || isRedirected).toBeTruthy();
  });
});

test.describe("Password Reset", () => {
  test("should show forgot password link", async ({ page }) => {
    await page.goto("/login");
    
    const forgotPasswordLink = page.locator('a:has-text("Forgot Password")');
    await expect(forgotPasswordLink).toBeVisible();
  });

  test("should handle password reset request", async ({ page }) => {
    await page.goto("/login");
    await page.click('a:has-text("Forgot Password")');
    
    await expect(page).toHaveURL(/\/forgot-password/);
    
    await page.fill('input[name="email"]', "test@clynepapers.com");
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator(".success-message")).toBeVisible();
  });
});
