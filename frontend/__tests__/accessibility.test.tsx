import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe } from "jest-axe";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import CreateInvoiceModal from "../src/components/CreateInvoiceModal";
import CreateCustomerModal from "../src/components/CreateCustomerModal";
import CreateSalesReturnModal from "../src/components/CreateSalesReturnModal";
import { Invoice } from "../src/types";

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

  describe("CreateSalesReturnModal Accessibility", () => {
    const mockInvoice: Invoice = {
      id: "test-invoice-1",
      invoiceNumber: "INV-2024-001",
      date: "2024-01-15",
      customerId: "test-customer-1",
      customerName: "Test Customer",
      totalAmount: 150000,
      taxAmount: 0,
      discountAmount: 0,
      status: "PAID",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
      customer: {
        id: "test-customer-1",
        name: "Test Customer",
        email: "test@example.com",
        phone: "1234567890",
        address: "123 Test St",
        locationId: "test-location-1",
        defaultPaymentTermDays: 30,
        locationRef: {
          id: "test-location-1",
          name: "Test Location",
          isActive: true,
        },
        createdAt: "2024-01-01T10:00:00Z",
        updatedAt: "2024-01-01T10:00:00Z",
      },
      items: [
        {
          id: "item-1",
          inventoryItemId: "inv-1",
          quantity: 100,
          unitPrice: 1000,
          lineTotal: 100000,
          inventoryItem: {
            id: "inv-1",
            name: "Jumbo Tissue Roll",
            sku: "JTR-001",
            unit: "rolls",
          },
        },
        {
          id: "item-2",
          inventoryItemId: "inv-2",
          quantity: 50,
          unitPrice: 1000,
          lineTotal: 50000,
          inventoryItem: {
            id: "inv-2",
            name: "Premium Napkins",
            sku: "PN-002",
            unit: "packs",
          },
        },
      ],
    };

    test("should not have color contrast violations", async () => {
      const { container } = render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
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

    test("should have accessible table headers", () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check that table headers are present and readable
      expect(screen.getByText(/select/i)).toBeInTheDocument();
      expect(screen.getByText(/product/i)).toBeInTheDocument();
      expect(screen.getByText(/sku/i)).toBeInTheDocument();
      expect(screen.getByText(/invoiced qty/i)).toBeInTheDocument();
      expect(screen.getByText(/return qty/i)).toBeInTheDocument();
      expect(screen.getByText(/condition/i)).toBeInTheDocument();
      expect(screen.getByText(/unit price/i)).toBeInTheDocument();
    });

    test("should have accessible close button with aria-label", () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const closeButton = screen.getByLabelText(/close modal/i);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });

    test("should have proper form labels", () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Check required form fields have labels
      expect(screen.getByText(/reason for return/i)).toBeInTheDocument();
      expect(screen.getByText(/refund method/i)).toBeInTheDocument();
      expect(screen.getByText(/additional notes/i)).toBeInTheDocument();
    });

    test("should have readable modal heading", () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      const heading = screen.getByText(/create sales return/i);
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
    });
  });
});
