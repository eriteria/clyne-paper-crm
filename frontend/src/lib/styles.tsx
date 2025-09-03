// Utility classes for consistent form styling across the application
// This ensures all form inputs have proper visibility and consistent appearance

export const formInputClasses = {
  // Standard input field (text, email, tel, etc.)
  input:
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500",

  // Search input with icon space
  searchInput:
    "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500",

  // Textarea
  textarea:
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500",

  // Select dropdown
  select:
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white",

  // Label
  label: "block text-sm font-medium text-gray-700 mb-2",

  // Error state input
  inputError:
    "w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 placeholder-gray-500",

  // Disabled input
  inputDisabled:
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 bg-gray-50 cursor-not-allowed",
};

// Button classes for consistency
export const buttonClasses = {
  primary:
    "bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors",
  secondary:
    "px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors",
  danger:
    "bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors",
  success:
    "bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors",
  // Pagination and small buttons
  pagination:
    "px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700",
  // Icon buttons
  iconButton: "p-1 rounded text-gray-600 hover:text-gray-900 transition-colors",
};

// Common layout classes
export const layoutClasses = {
  modalOverlay:
    "fixed inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-50 p-4",
  modalContent: "bg-white rounded-lg shadow-xl w-full max-w-2xl",
  modalHeader: "flex items-center justify-between p-6 border-b border-gray-200",
  modalBody: "p-6 space-y-6",
  modalFooter: "flex justify-end space-x-3 p-6 border-t",
  card: "bg-white rounded-lg shadow-sm border border-gray-200",
  cardHeader: "px-6 py-4 border-b border-gray-200",
  cardBody: "p-6",
};

// Form grid layouts
export const gridClasses = {
  twoColumn: "grid grid-cols-1 md:grid-cols-2 gap-6",
  threeColumn: "grid grid-cols-1 md:grid-cols-3 gap-6",
  fullWidth: "md:col-span-2",
};

/**
 * Common input component to ensure consistent styling
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSearchInput?: boolean;
}

export function Input({
  label,
  error,
  isSearchInput = false,
  className,
  ...props
}: InputProps) {
  const inputClass = isSearchInput
    ? formInputClasses.searchInput
    : formInputClasses.input;
  const finalClassName = error
    ? formInputClasses.inputError
    : className
    ? `${inputClass} ${className}`
    : inputClass;

  return (
    <div>
      {label && <label className={formInputClasses.label}>{label}</label>}
      <input className={finalClassName} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Common textarea component to ensure consistent styling
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  const finalClassName = error
    ? `${formInputClasses.textarea} border-red-300 focus:ring-red-500`
    : className
    ? `${formInputClasses.textarea} ${className}`
    : formInputClasses.textarea;

  return (
    <div>
      {label && <label className={formInputClasses.label}>{label}</label>}
      <textarea className={finalClassName} {...props} />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Common select component to ensure consistent styling
 */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  options,
  className,
  ...props
}: SelectProps) {
  const finalClassName = error
    ? `${formInputClasses.select} border-red-300 focus:ring-red-500`
    : className
    ? `${formInputClasses.select} ${className}`
    : formInputClasses.select;

  return (
    <div>
      {label && <label className={formInputClasses.label}>{label}</label>}
      <select className={finalClassName} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

const styles = {
  formInputClasses,
  buttonClasses,
  layoutClasses,
  gridClasses,
  Input,
  Textarea,
  Select,
};

// Card Components
export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
    {children}
  </h3>
);

export const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`px-6 py-4 ${className}`}>{children}</div>;

export default styles;
