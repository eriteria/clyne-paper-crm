/**
 * Accessibility and Contrast Testing Utilities
 *
 * This module provides tools to test UI accessibility, including:
 * - Color contrast testing
 * - Text readability validation
 * - Keyboard navigation testing
 * - Screen reader compatibility
 */

interface ContrastResult {
  ratio: number;
  level: "AA" | "AAA" | "FAIL";
  readable: boolean;
}

interface AccessibilityTestResult {
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Calculate color contrast ratio between two colors
 * @param color1 - First color (hex, rgb, or color name)
 * @param color2 - Second color (hex, rgb, or color name)
 * @returns Contrast ratio and WCAG compliance level
 */
export function calculateContrast(
  color1: string,
  color2: string
): ContrastResult {
  // Convert colors to RGB values
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    return { ratio: 0, level: "FAIL", readable: false };
  }

  // Calculate relative luminance
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  // Calculate contrast ratio
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (brighter + 0.05) / (darker + 0.05);

  // Determine WCAG compliance level
  let level: "AA" | "AAA" | "FAIL";
  let readable: boolean;

  if (ratio >= 7) {
    level = "AAA";
    readable = true;
  } else if (ratio >= 4.5) {
    level = "AA";
    readable = true;
  } else {
    level = "FAIL";
    readable = false;
  }

  return { ratio, level, readable };
}

/**
 * Test accessibility of a DOM element
 * @param element - DOM element to test
 * @returns Accessibility test results
 */
export function testElementAccessibility(
  element: HTMLElement
): AccessibilityTestResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for proper labels
  if (
    element.tagName === "INPUT" ||
    element.tagName === "SELECT" ||
    element.tagName === "TEXTAREA"
  ) {
    const hasLabel =
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby") ||
      document.querySelector(`label[for="${element.id}"]`);

    if (!hasLabel) {
      issues.push("Form element missing accessible label");
      suggestions.push(
        "Add aria-label attribute or associate with a label element"
      );
    }
  }

  // Check for sufficient color contrast
  const computedStyle = window.getComputedStyle(element);
  const textColor = computedStyle.color;
  const backgroundColor = computedStyle.backgroundColor;

  if (textColor && backgroundColor && backgroundColor !== "rgba(0, 0, 0, 0)") {
    const contrast = calculateContrast(textColor, backgroundColor);
    if (!contrast.readable) {
      issues.push(
        `Insufficient color contrast (${contrast.ratio.toFixed(2)}:1)`
      );
      suggestions.push(
        "Increase color contrast to at least 4.5:1 for normal text"
      );
    }
  }

  // Check for keyboard accessibility
  const isInteractive = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(
    element.tagName
  );
  const hasTabIndex = element.hasAttribute("tabindex");
  const tabIndex = element.getAttribute("tabindex");

  if (isInteractive && tabIndex === "-1") {
    issues.push("Interactive element is not keyboard accessible");
    suggestions.push(
      'Remove tabindex="-1" or provide alternative keyboard navigation'
    );
  }

  // Check for proper focus indicators
  if (isInteractive) {
    const focusStyles = computedStyle.getPropertyValue("outline");
    const focusRing = computedStyle.getPropertyValue("box-shadow");

    if (!focusStyles && !focusRing) {
      issues.push("No visible focus indicator");
      suggestions.push("Add :focus styles with visible outline or box-shadow");
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Test entire page accessibility
 * @param container - Container element (usually document.body)
 * @returns Overall accessibility report
 */
export function testPageAccessibility(
  container: HTMLElement = document.body
): AccessibilityTestResult {
  const allIssues: string[] = [];
  const allSuggestions: string[] = [];

  // Test all interactive elements
  const interactiveElements = container.querySelectorAll(
    'button, input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
  );

  interactiveElements.forEach((element, index) => {
    const result = testElementAccessibility(element as HTMLElement);
    result.issues.forEach((issue) => {
      allIssues.push(`Element ${index + 1} (${element.tagName}): ${issue}`);
    });
    result.suggestions.forEach((suggestion) => {
      allSuggestions.push(`Element ${index + 1}: ${suggestion}`);
    });
  });

  // Check heading structure
  const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let previousLevel = 0;

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    if (index === 0 && level !== 1) {
      allIssues.push("Page should start with h1 heading");
      allSuggestions.push("Use h1 for the main page heading");
    }
    if (level > previousLevel + 1) {
      allIssues.push(
        `Heading level skipped: ${heading.tagName} after h${previousLevel}`
      );
      allSuggestions.push("Use sequential heading levels (h1, h2, h3, etc.)");
    }
    previousLevel = level;
  });

  return {
    passed: allIssues.length === 0,
    issues: allIssues,
    suggestions: allSuggestions,
  };
}

/**
 * Generate an accessibility report for React components during testing
 */
export function generateAccessibilityReport(
  componentName: string,
  container: HTMLElement
): void {
  console.log(`\n🔍 Accessibility Report for ${componentName}`);
  console.log("=".repeat(50));

  const result = testPageAccessibility(container);

  if (result.passed) {
    console.log("✅ All accessibility tests passed!");
  } else {
    console.log("❌ Accessibility issues found:");
    result.issues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });

    console.log("\n💡 Suggestions:");
    result.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }

  console.log("\n📊 Summary:");
  console.log(`  - Issues found: ${result.issues.length}`);
  console.log(`  - Suggestions: ${result.suggestions.length}`);
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  if (hex.startsWith("#")) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  // Handle rgb/rgba colors
  const rgbMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  // Handle named colors (simplified)
  const namedColors: { [key: string]: { r: number; g: number; b: number } } = {
    white: { r: 255, g: 255, b: 255 },
    black: { r: 0, g: 0, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
  };

  return namedColors[hex.toLowerCase()] || null;
}

function getRelativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  const { r, g, b } = rgb;

  const [rs, gs, bs] = [r, g, b].map((c) => {
    const normalized = c / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Example usage and testing utilities
export const AccessibilityTestSuite = {
  /**
   * Test all common UI elements for accessibility
   */
  testCommonElements: () => {
    console.log("🧪 Running Accessibility Test Suite...\n");

    // Test buttons
    const buttons = document.querySelectorAll("button");
    console.log(`Testing ${buttons.length} buttons...`);
    buttons.forEach((button, index) => {
      const result = testElementAccessibility(button as HTMLElement);
      if (!result.passed) {
        console.log(`❌ Button ${index + 1}: ${result.issues.join(", ")}`);
      }
    });

    // Test form inputs
    const inputs = document.querySelectorAll("input, select, textarea");
    console.log(`Testing ${inputs.length} form inputs...`);
    inputs.forEach((input, index) => {
      const result = testElementAccessibility(input as HTMLElement);
      if (!result.passed) {
        console.log(`❌ Input ${index + 1}: ${result.issues.join(", ")}`);
      }
    });

    // Test color contrast on text elements
    const textElements = document.querySelectorAll(
      "p, span, div, label, h1, h2, h3, h4, h5, h6"
    );
    let contrastIssues = 0;

    textElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const computedStyle = window.getComputedStyle(htmlElement);
      const textColor = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;

      if (
        textColor &&
        backgroundColor &&
        backgroundColor !== "rgba(0, 0, 0, 0)"
      ) {
        const contrast = calculateContrast(textColor, backgroundColor);
        if (!contrast.readable) {
          contrastIssues++;
        }
      }
    });

    console.log(`\n📊 Results:`);
    console.log(`  - Elements with contrast issues: ${contrastIssues}`);
    console.log(`  - Total elements tested: ${textElements.length}`);
  },

  /**
   * Quick contrast test for specific colors
   */
  quickContrastTest: (foreground: string, background: string) => {
    const result = calculateContrast(foreground, background);
    console.log(`\n🎨 Contrast Test: ${foreground} on ${background}`);
    console.log(`   Ratio: ${result.ratio.toFixed(2)}:1`);
    console.log(`   Level: ${result.level}`);
    console.log(`   Readable: ${result.readable ? "✅" : "❌"}`);
    return result;
  },
};
