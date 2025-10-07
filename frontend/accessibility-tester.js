/**
 * Browser-based Accessibility Testing Tool
 *
 * This script can be run in the browser console to test UI accessibility
 * including color contrast, text readability, and keyboard navigation.
 *
 * Usage:
 * 1. Open your CRM application in the browser
 * 2. Open Developer Tools (F12)
 * 3. Copy and paste this script into the Console
 * 4. Run: AccessibilityTester.runFullTest()
 */

window.AccessibilityTester = {
  /**
   * Test color contrast for all text elements
   */
  testColorContrast() {
    console.log("🎨 Testing Color Contrast...\n");

    const textElements = document.querySelectorAll("*");
    const issues = [];

    textElements.forEach((element) => {
      const style = window.getComputedStyle(element);
      const textColor = style.color;
      const backgroundColor = style.backgroundColor;

      // Skip if no background color or transparent
      if (!backgroundColor || backgroundColor === "rgba(0, 0, 0, 0)") {
        return;
      }

      // Skip if no text content
      if (!element.textContent?.trim()) {
        return;
      }

      const contrast = this.calculateContrastRatio(textColor, backgroundColor);

      if (contrast < 4.5) {
        issues.push({
          element:
            element.tagName +
            (element.className ? `.${element.className}` : ""),
          contrast: contrast.toFixed(2),
          textColor,
          backgroundColor,
          text: element.textContent.substring(0, 50) + "...",
        });
      }
    });

    console.log(`Found ${issues.length} contrast issues:`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.element}`);
      console.log(`   Contrast: ${issue.contrast}:1 (needs ≥4.5:1)`);
      console.log(`   Text: "${issue.text}"`);
      console.log(
        `   Colors: ${issue.textColor} on ${issue.backgroundColor}\n`
      );
    });

    return issues;
  },

  /**
   * Test form accessibility
   */
  testFormAccessibility() {
    console.log("📝 Testing Form Accessibility...\n");

    const formElements = document.querySelectorAll(
      "input, select, textarea, button"
    );
    const issues = [];

    formElements.forEach((element) => {
      const tagName = element.tagName;
      const type = element.getAttribute("type") || "";
      const id = element.id;
      const hasLabel = this.hasAccessibleLabel(element);
      const isFocusable = this.isFocusable(element);

      // Check for labels
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tagName) && !hasLabel) {
        issues.push({
          element: `${tagName}${type ? `[type="${type}"]` : ""}${
            id ? `#${id}` : ""
          }`,
          issue: "Missing accessible label",
          suggestion:
            "Add aria-label attribute or associate with label element",
        });
      }

      // Check keyboard accessibility
      if (!isFocusable && tagName === "BUTTON") {
        issues.push({
          element: `BUTTON${id ? `#${id}` : ""}`,
          issue: "Button not keyboard accessible",
          suggestion: 'Remove tabindex="-1" or ensure button is focusable',
        });
      }
    });

    console.log(`Found ${issues.length} form accessibility issues:`);
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.element}: ${issue.issue}`);
      console.log(`   💡 ${issue.suggestion}\n`);
    });

    return issues;
  },

  /**
   * Test heading structure
   */
  testHeadingStructure() {
    console.log("📋 Testing Heading Structure...\n");

    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const issues = [];
    let previousLevel = 0;

    if (headings.length === 0) {
      issues.push("No headings found on the page");
    }

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent?.trim() || "";

      console.log(`${heading.tagName}: "${text}"`);

      if (index === 0 && level !== 1) {
        issues.push("Page should start with H1");
      }

      if (level > previousLevel + 1) {
        issues.push(
          `Heading level skipped: ${heading.tagName} after H${previousLevel}`
        );
      }

      previousLevel = level;
    });

    if (issues.length > 0) {
      console.log("\n⚠️ Heading structure issues:");
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    } else {
      console.log("\n✅ Heading structure looks good!");
    }

    return issues;
  },

  /**
   * Test your payment terms implementation specifically
   */
  testPaymentTermsAccessibility() {
    console.log("💰 Testing Payment Terms Feature Accessibility...\n");

    const issues = [];

    // Look for customer modals
    const customerModal = document.querySelector('[class*="Customer"]');
    if (customerModal) {
      const paymentTermsField = customerModal.querySelector(
        'select, input[name*="payment"], [aria-label*="payment"]'
      );
      if (paymentTermsField) {
        const hasLabel = this.hasAccessibleLabel(paymentTermsField);
        if (!hasLabel) {
          issues.push("Payment terms field missing accessible label");
        }
        console.log("✅ Payment terms field found in customer modal");
      } else {
        console.log("⚠️ Payment terms field not found in customer modal");
      }
    }

    // Look for invoice modals
    const invoiceModal = document.querySelector('[class*="Invoice"]');
    if (invoiceModal) {
      const dueDateField = invoiceModal.querySelector(
        'input[type="date"], [aria-label*="due"]'
      );

      if (dueDateField) {
        console.log("✅ Due date field found in invoice modal");
        const hasPaymentTermInfo =
          invoiceModal.textContent?.includes("payment term");
        if (hasPaymentTermInfo) {
          console.log("✅ Payment term information displayed to user");
        } else {
          issues.push("Payment term information not clearly displayed");
        }
      }
    }

    console.log(`\nPayment terms accessibility issues: ${issues.length}`);
    issues.forEach((issue) => console.log(`❌ ${issue}`));

    return issues;
  },

  /**
   * Run comprehensive accessibility test
   */
  runFullTest() {
    console.clear();
    console.log("🔍 CLYNE PAPER CRM - ACCESSIBILITY TEST REPORT");
    console.log("=".repeat(50));
    console.log(`Tested at: ${new Date().toLocaleString()}\n`);

    const contrastIssues = this.testColorContrast();
    const formIssues = this.testFormAccessibility();
    const headingIssues = this.testHeadingStructure();
    const paymentTermsIssues = this.testPaymentTermsAccessibility();

    const totalIssues =
      contrastIssues.length +
      formIssues.length +
      headingIssues.length +
      paymentTermsIssues.length;

    console.log("\n📊 SUMMARY");
    console.log("=".repeat(20));
    console.log(`Color contrast issues: ${contrastIssues.length}`);
    console.log(`Form accessibility issues: ${formIssues.length}`);
    console.log(`Heading structure issues: ${headingIssues.length}`);
    console.log(`Payment terms issues: ${paymentTermsIssues.length}`);
    console.log(`Total issues: ${totalIssues}`);

    if (totalIssues === 0) {
      console.log("\n🎉 Congratulations! No accessibility issues found!");
    } else {
      console.log(
        `\n⚠️ Found ${totalIssues} accessibility issues that should be addressed.`
      );
    }

    console.log("\n💡 To test individual areas, use:");
    console.log("   AccessibilityTester.testColorContrast()");
    console.log("   AccessibilityTester.testFormAccessibility()");
    console.log("   AccessibilityTester.testHeadingStructure()");
    console.log("   AccessibilityTester.testPaymentTermsAccessibility()");

    return {
      totalIssues,
      contrastIssues: contrastIssues.length,
      formIssues: formIssues.length,
      headingIssues: headingIssues.length,
      paymentTermsIssues: paymentTermsIssues.length,
    };
  },

  // Helper methods
  calculateContrastRatio(color1, color2) {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);

    if (!rgb1 || !rgb2) return 0;

    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);

    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (brighter + 0.05) / (darker + 0.05);
  },

  parseColor(color) {
    // Handle rgb/rgba
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3]),
      };
    }
    return null;
  },

  getRelativeLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const normalized = c / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  },

  hasAccessibleLabel(element) {
    return (
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby") ||
      document.querySelector(`label[for="${element.id}"]`) ||
      element.closest("label")
    );
  },

  isFocusable(element) {
    const tabIndex = element.getAttribute("tabindex");
    return tabIndex !== "-1" && !element.disabled;
  },
};

// Auto-run instructions
console.log("🔧 Accessibility Testing Tool Loaded!");
console.log(
  "📖 Run AccessibilityTester.runFullTest() to test your CRM application"
);
console.log("🎯 Or test specific areas with individual methods");
