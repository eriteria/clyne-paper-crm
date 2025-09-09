// Simple toast notification utility to replace sonner
type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

const showToast = (message: string, options: ToastOptions = {}) => {
  const { type = "info", duration = 3000 } = options;

  // For now, use simple alert/console.log
  // In a real app, you'd implement a proper toast system
  console.log(`[${type.toUpperCase()}] ${message}`);

  if (type === "error") {
    alert(`Error: ${message}`);
  } else if (type === "success") {
    alert(`Success: ${message}`);
  }
};

export const toast = {
  success: (message: string) => showToast(message, { type: "success" }),
  error: (message: string) => showToast(message, { type: "error" }),
  info: (message: string) => showToast(message, { type: "info" }),
  warning: (message: string) => showToast(message, { type: "warning" }),
};
