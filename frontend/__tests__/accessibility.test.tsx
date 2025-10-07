import React from "react";
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CreateInvoiceModal from "../src/components/CreateInvoiceModal";
import CreateCustomerModal from "../src/components/CreateCustomerModal";

// Test wrapper with React Query
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe("Accessibility Tests - UI Contrast & Readability", () => {
  let TestWrapper: ReturnType<typeof createTestWrapper>;

  beforeEach(() => {
    TestWrapper = createTestWrapper();
  });

  describe("CreateInvoiceModal Accessibility", () => {
    test("should not have color contrast violations", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "color-contrast-enhanced": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have readable text labels", () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check that all form labels are present and readable
      expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
      expect(screen.getByText(/invoice date/i)).toBeInTheDocument();
      expect(screen.getByText(/due date/i)).toBeInTheDocument();
      expect(screen.getByText(/payment term/i)).toBeInTheDocument();
    });

    test("should have accessible form controls", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          label: { enabled: true },
          "form-field-multiple-labels": { enabled: true },
          "label-title-only": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have proper focus indicators", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          "focus-order-semantics": { enabled: true },
          "focusable-content": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });
  });

  describe("CreateCustomerModal Accessibility", () => {
    test("should have sufficient color contrast for payment terms field", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have readable payment terms options", () => {
      render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check that payment terms field and options are readable
      expect(screen.getByText(/payment terms/i)).toBeInTheDocument();

      // The select element should be accessible
      const paymentTermsSelect = screen.getByDisplayValue("30");
      expect(paymentTermsSelect).toBeInTheDocument();
      expect(paymentTermsSelect).toHaveAttribute("aria-label");
    });
  });

  describe("General UI Readability Tests", () => {
    test("should check button text contrast and readability", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check for common button text
      const buttons = [
        screen.getByText(/post invoice/i),
        screen.getByText(/cancel/i),
      ];

      buttons.forEach((button) => {
        expect(button).toBeInTheDocument();
        expect(button).toBeVisible();
      });

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "link-in-text-block": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should check error message readability", () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Look for help text that should be readable
      const helpTexts = screen.getAllByText(/payment term/i);
      expect(helpTexts.length).toBeGreaterThan(0);

      helpTexts.forEach((text) => {
        expect(text).toBeVisible();
      });
    });

    test("should ensure modal backdrop provides sufficient contrast", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check overall modal accessibility
      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "color-contrast-enhanced": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });
  });

  describe("Keyboard Navigation & Screen Reader Tests", () => {
    test("should have proper heading structure for screen readers", () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const heading = screen.getByRole("heading");
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/create new invoice/i);
    });

    test("should have proper ARIA labels for form fields", () => {
      render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check that critical form fields have proper labels
      const nameInput = screen.getByLabelText(/customer name/i);
      const locationSelect = screen.getByLabelText(/location/i);

      expect(nameInput).toBeInTheDocument();
      expect(locationSelect).toBeInTheDocument();
    });
  });
});
