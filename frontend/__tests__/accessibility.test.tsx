import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(
          container.querySelector('input[type="date"]')
        ).toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "color-contrast-enhanced": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have readable text labels", async () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount and state to settle
      await waitFor(() => {
        expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
      });

      // Check that all form labels are present and readable
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

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(
          container.querySelector('input[type="date"]')
        ).toBeInTheDocument();
      });

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

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(
          container.querySelector('input[type="date"]')
        ).toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          "focus-order-semantics": { enabled: true },
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

      // Wait for component to mount
      await waitFor(() => {
        expect(container.querySelector("select")).toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have readable payment terms options", async () => {
      render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByLabelText(/payment terms/i)).toBeInTheDocument();
      });

      // Check that payment terms field and options are readable
      expect(screen.getByText(/payment terms/i)).toBeInTheDocument();

      // The select element should be accessible with proper label association
      const paymentTermsSelect = screen.getByLabelText(/payment terms/i);
      expect(paymentTermsSelect).toBeInTheDocument();
      expect(paymentTermsSelect).toHaveValue("30");
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

      // Wait for component to mount
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /post/i })
        ).toBeInTheDocument();
      });

      // Check for common button text
      const postButton = screen.getByRole("button", { name: /post/i });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      expect(postButton).toBeInTheDocument();
      expect(postButton).toBeVisible();
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeVisible();

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "link-in-text-block": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should check error message readability", async () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getAllByText(/payment term/i).length).toBeGreaterThan(0);
      });

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

      // Wait for component to mount
      await waitFor(() => {
        expect(container.querySelector("select")).toBeInTheDocument();
      });

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
    test("should have proper heading structure for screen readers", async () => {
      render(
        <TestWrapper>
          <CreateInvoiceModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
      });

      const heading = screen.getByRole("heading", { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(/create new invoice/i);
    });

    test("should have proper ARIA labels for form fields", async () => {
      render(
        <TestWrapper>
          <CreateCustomerModal
            isOpen={true}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
      });

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

      // Wait for component to mount
      await waitFor(() => {
        expect(container.querySelector("table")).toBeInTheDocument();
      });

      const results = await axe(container, {
        rules: {
          "color-contrast": { enabled: true },
          "color-contrast-enhanced": { enabled: true },
        },
      });

      expect(results.violations).toHaveLength(0);
    });

    test("should have accessible table headers", async () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);
      });

      // Check that table headers are present and readable using more specific queries
      const headers = screen.getAllByRole("columnheader");
      const headerTexts = headers.map((h) => h.textContent);

      expect(headerTexts).toContain("Select");
      expect(headerTexts).toContain("Product");
      expect(headerTexts).toContain("SKU");
      expect(headerTexts).toContain("Invoiced Qty");
      expect(headerTexts).toContain("Return Qty");
      expect(headerTexts).toContain("Condition");
      expect(headerTexts).toContain("Unit Price");
    });

    test("should have accessible close button with aria-label", async () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByLabelText(/close modal/i)).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText(/close modal/i);
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toBeVisible();
    });

    test("should have proper form labels", async () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByText(/reason for return/i)).toBeInTheDocument();
      });

      // Check required form fields have labels
      expect(screen.getByText(/reason for return/i)).toBeInTheDocument();
      expect(screen.getByText(/refund method/i)).toBeInTheDocument();
      expect(screen.getByText(/additional notes/i)).toBeInTheDocument();
    });

    test("should have readable modal heading", async () => {
      render(
        <TestWrapper>
          <CreateSalesReturnModal
            invoice={mockInvoice}
            onClose={() => {}}
            onSuccess={() => {}}
          />
        </TestWrapper>
      );

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByText(/create sales return/i)).toBeInTheDocument();
      });

      const heading = screen.getByText(/create sales return/i);
      expect(heading).toBeInTheDocument();
      expect(heading).toBeVisible();
    });
  });
});
