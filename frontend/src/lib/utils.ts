import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiClient } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString();
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString();
}

export async function downloadInvoicePDF(
  invoiceId: string,
  invoiceNumber: string
): Promise<void> {
  try {
    const res = await apiClient.get(`/invoices/${invoiceId}/pdf`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Invoice-${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download PDF:", error);
    throw new Error("Failed to download PDF");
  }
}
