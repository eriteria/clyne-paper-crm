import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "destructive":
        return "bg-red-600 text-white hover:bg-red-700";
      case "outline":
        return "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
      case "secondary":
        return "bg-gray-200 text-gray-900 hover:bg-gray-300";
      case "ghost":
        return "text-gray-700 hover:bg-gray-100";
      case "link":
        return "text-blue-600 underline hover:text-blue-800";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "lg":
        return "px-6 py-3 text-lg";
      case "icon":
        return "p-2";
      default:
        return "px-4 py-2";
    }
  };

  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  return (
    <button
      className={`${baseClasses} ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
