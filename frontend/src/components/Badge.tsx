import React from "react";

interface BadgeProps {
  count: number;
  maxCount?: number;
  variant?: "default" | "danger" | "warning" | "success";
  size?: "small" | "medium";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  count,
  maxCount = 99,
  variant = "default",
  size = "small",
  className = "",
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  const getVariantClasses = () => {
    switch (variant) {
      case "danger":
        return "bg-red-500 text-white";
      case "warning":
        return "bg-yellow-500 text-white";
      case "success":
        return "bg-green-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "medium":
        return "h-6 w-6 text-xs";
      default:
        return "h-5 w-5 text-xs";
    }
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        ${getSizeClasses()}
        ${getVariantClasses()}
        rounded-full font-medium
        animate-pulse
        ${className}
      `}
      style={{
        minWidth: size === "medium" ? "24px" : "20px",
      }}
    >
      {displayCount}
    </span>
  );
};

export default Badge;
