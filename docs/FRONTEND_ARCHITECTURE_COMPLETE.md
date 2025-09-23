# Clyne Paper CRM Frontend - Complete Architecture Guide

**A Comprehensive Guide for Beginners**

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Concepts & Architecture](#core-concepts--architecture)
5. [Pages & Routing](#pages--routing)
6. [Components Architecture](#components-architecture)
7. [State Management](#state-management)
8. [Data Fetching & API Integration](#data-fetching--api-integration)
9. [Authentication System](#authentication-system)
10. [Styling System](#styling-system)
11. [User Experience Features](#user-experience-features)
12. [Why Things Are Built This Way](#why-things-are-built-this-way)

---

## Project Overview

The Clyne Paper CRM Frontend is a modern web application built with **React** and **Next.js** that provides a comprehensive user interface for managing all aspects of Clyne Paper Limited's business operations.

### What This Frontend Does

- **Dashboard**: Real-time business overview with charts and metrics
- **Customer Management**: Add, edit, view customer information and history
- **Sales Operations**: Create invoices, track payments, manage credits
- **Inventory Control**: Monitor stock levels, process deliveries
- **Team Management**: Organize users, teams, and permissions
- **Financial Reporting**: Track sales performance and financial health
- **Administrative Functions**: User management, system settings

### Why a Separate Frontend?

Instead of server-rendered pages (like traditional PHP websites), this is a **Single Page Application (SPA)** that:

- Loads once, then dynamically updates content
- Provides fast, responsive user experience
- Works like a desktop application in the browser
- Can work offline (when implemented)
- Separates concerns (frontend/backend teams can work independently)

---

## Technology Stack

### Core Framework

```json
{
  "next": "15.5.2", // React framework with routing
  "react": "19.1.0", // UI library
  "typescript": "^5" // Type safety
}
```

### Styling & UI

```json
{
  "tailwindcss": "^4", // Utility-first CSS framework
  "lucide-react": "^0.542.0", // Icon library
  "@headlessui/react": "^2.2.7" // Unstyled, accessible UI components
}
```

### State Management & Data Fetching

```json
{
  "@tanstack/react-query": "^5.85.6", // Server state management
  "axios": "^1.11.0" // HTTP client
}
```

### Form Handling & Validation

```json
{
  "react-hook-form": "^7.62.0", // Form state management
  "zod": "^4.1.5", // Schema validation
  "@hookform/resolvers": "^5.2.1" // Zod + React Hook Form integration
}
```

### Charts & Visualization

```json
{
  "recharts": "^3.1.2" // Chart library for dashboard
}
```

### Why These Choices?

**Next.js over Create React App**:

- Built-in routing (no need for React Router)
- Automatic code splitting for better performance
- Built-in optimization for production
- Server-side rendering capability (when needed)

**TypeScript over JavaScript**:

```typescript
// TypeScript catches errors at compile time
interface Customer {
  id: string;
  name: string;
  email?: string; // Optional field
}

// This would error if you try to pass wrong data type:
const customer: Customer = {
  id: "123",
  name: "John Doe",
  email: 123, // ❌ Error: number is not string
};
```

**Tailwind CSS over Traditional CSS**:

```tsx
// Instead of writing CSS files:
// .my-button { background: blue; padding: 8px; border-radius: 4px; }

// You write classes directly:
<button className="bg-blue-500 px-2 py-1 rounded">Click me</button>
```

**React Query over useEffect + fetch**:

```tsx
// Old way: Complex state management
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch("/api/customers")
    .then((res) => res.json())
    .then((data) => setData(data))
    .catch((err) => setError(err))
    .finally(() => setLoading(false));
}, []);

// React Query way: Simple and powerful
const { data, isLoading, error } = useQuery({
  queryKey: ["customers"],
  queryFn: () => apiClient.get("/customers"),
});
```

---

## Project Structure

```
frontend/src/
├── app/                    # Pages (Next.js App Router)
│   ├── page.tsx           # Home page (redirects to login/dashboard)
│   ├── layout.tsx         # Root layout with providers
│   ├── globals.css        # Global styles
│   ├── login/             # Login page
│   ├── dashboard/         # Main dashboard
│   ├── customers/         # Customer management pages
│   ├── invoices/          # Invoice management pages
│   ├── inventory/         # Inventory management pages
│   ├── payments/          # Payment management pages
│   ├── financial/         # Financial reports
│   ├── products/          # Product management
│   ├── teams/             # Team management
│   ├── users/             # User management
│   ├── admin/             # Admin functions
│   ├── settings/          # System settings
│   └── import/            # Data import functions
│
├── components/            # Reusable UI components
│   ├── ui/                # Basic UI components (buttons, inputs, etc.)
│   ├── modals/            # Modal dialogs
│   ├── forms/             # Form components
│   ├── charts/            # Chart components
│   └── layout/            # Layout components (sidebar, header)
│
├── hooks/                 # Custom React hooks
│   ├── useAuth.tsx        # Authentication logic
│   ├── useLoading.tsx     # Loading state management
│   ├── useSidebar.tsx     # Sidebar collapse/expand
│   └── useDashboard.tsx   # Dashboard data fetching
│
├── lib/                   # Utility libraries
│   ├── api.ts             # API client configuration
│   ├── utils.ts           # General utility functions
│   └── services/          # Business logic services
│
└── types/                 # TypeScript type definitions
    └── index.ts           # Shared interfaces and types
```

### Why This Structure?

**App Directory (Next.js 13+ App Router)**:

- Each folder = a route in your app
- `page.tsx` = the actual page content
- `layout.tsx` = shared layout for that section
- Automatic code splitting per route

**Components Organization**:

- **ui/**: Basic building blocks (buttons, inputs) used everywhere
- **Specific components**: Complex components used in specific pages
- **Modals**: Popup dialogs that can be used across different pages

**Hooks Directory**:

- Custom hooks contain reusable logic
- Separates business logic from UI components
- Makes components cleaner and more focused

---

## Core Concepts & Architecture

### 1. Component-Based Architecture

Everything in React is a **component** - a reusable piece of UI:

```tsx
// Simple component
function Button({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      {children}
    </button>
  );
}

// Complex component
function CustomerCard({ customer }) {
  return (
    <div className="border rounded-lg p-4">
      <h3>{customer.name}</h3>
      <p>{customer.email}</p>
      <Button onClick={() => editCustomer(customer)}>Edit</Button>
    </div>
  );
}
```

### 2. Props vs State

**Props**: Data passed from parent to child (like function parameters)

```tsx
// Parent passes data down
<CustomerCard customer={customerData} />;

// Child receives and uses data
function CustomerCard({ customer }) {
  return <div>{customer.name}</div>;
}
```

**State**: Data that changes over time within a component

```tsx
function SearchBar() {
  const [searchTerm, setSearchTerm] = useState(""); // Local state

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)} // Updates state
    />
  );
}
```

### 3. React Hooks

Hooks are functions that let you "hook into" React features:

```tsx
function CustomersPage() {
  // State hook - manages local component state
  const [customers, setCustomers] = useState([]);

  // Effect hook - runs side effects (API calls, subscriptions)
  useEffect(() => {
    fetchCustomers().then(setCustomers);
  }, []); // Empty array = run once when component mounts

  // Custom hook - encapsulates reusable logic
  const { user, login, logout } = useAuth();

  return (
    <div>
      <h1>Welcome {user.name}</h1>
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

### 4. Context API (Global State)

Instead of passing data through many components, Context provides global state:

```tsx
// Create context
const AuthContext = createContext();

// Provider (usually in root layout)
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (credentials) => {
    // Login logic
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login }}>
      {children}
    </AuthContext.Provider>
  );
}

// Use context anywhere in the app
function Header() {
  const { user, logout } = useContext(AuthContext);
  return <div>Welcome {user.name}</div>;
}
```

---

## Pages & Routing

### Next.js App Router

The `app/` directory structure automatically creates routes:

```
app/
├── page.tsx                 # / (home)
├── login/page.tsx           # /login
├── dashboard/page.tsx       # /dashboard
├── customers/
│   ├── page.tsx            # /customers
│   └── [id]/
│       └── page.tsx        # /customers/123 (dynamic route)
├── invoices/
│   ├── page.tsx            # /invoices
│   └── import/
│       └── page.tsx        # /invoices/import
```

### Page Structure Example

```tsx
// app/customers/page.tsx
"use client"; // Tells Next.js this runs on client-side

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Page logic here...

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Add Customer
        </button>
      </div>

      {/* Page content */}
      <div className="bg-white rounded-lg shadow">
        {/* Customer list goes here */}
      </div>
    </div>
  );
}
```

### Layout System

Layouts wrap pages with common elements:

```tsx
// app/layout.tsx (Root Layout)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Sidebar />
          <main className="ml-64">
            {children} {/* Page content goes here */}
          </main>
        </Providers>
      </body>
    </html>
  );
}

// app/customers/layout.tsx (Customers Section Layout)
export default function CustomersLayout({ children }) {
  return (
    <div>
      <CustomerNavigation />
      {children}
    </div>
  );
}
```

---

## Components Architecture

### 1. UI Components (`components/ui/`)

Basic building blocks that are used everywhere:

```tsx
// components/ui/button.tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "font-medium rounded-lg focus:outline-none focus:ring-2";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const className = `${baseClasses} ${variants[variant]} ${sizes[size]}`;

  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}

// Usage:
<Button variant="primary" size="lg" onClick={handleSave}>
  Save Customer
</Button>;
```

### 2. Feature Components

Complex components for specific functionality:

```tsx
// components/CreateCustomerModal.tsx
interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCustomerModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await apiClient.post("/customers", data);
      onSuccess(); // Refresh customer list
      onClose(); // Close modal
    } catch (error) {
      // Handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Customer</h2>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  {...register("companyName", {
                    required: "Company name is required",
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.companyName && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              {/* More form fields... */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Customer"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### 3. Layout Components

Components that structure the application:

```tsx
// components/Sidebar.tsx
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: UserCheck },
  { name: "Invoices", href: "/invoices", icon: FileText },
  // ... more items
];

export default function Sidebar() {
  const pathname = usePathname(); // Next.js hook for current route
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div
      className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-40 transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <Building2 className="h-8 w-8 text-blue-600" />
        {!isCollapsed && (
          <h1 className="font-bold text-gray-900">Clyne Paper CRM</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {!isCollapsed && item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## State Management

The app uses multiple layers of state management:

### 1. Local Component State (useState)

For data that only one component needs:

```tsx
function SearchBar() {
  const [searchTerm, setSearchTerm] = useState(""); // Only this component needs it
  const [isSearching, setIsSearching] = useState(false);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search customers..."
    />
  );
}
```

### 2. Context API (Global State)

For data that many components need:

```tsx
// Authentication context
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    setUser(response.data.user);
    localStorage.setItem("token", response.data.token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Used anywhere in the app:
function Header() {
  const { user, logout } = useAuth(); // Custom hook wrapping useContext

  return (
    <div>
      Welcome, {user.name}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 3. React Query (Server State)

For data from the API:

```tsx
// Custom hook for fetching customers
export function useCustomers(searchTerm = "") {
  return useQuery({
    queryKey: ["customers", searchTerm], // Cache key
    queryFn: async () => {
      const response = await apiClient.get(`/customers?search=${searchTerm}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    enabled: true, // Always fetch when component mounts
  });
}

// Component using the hook
function CustomersList() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: customers,
    isLoading,
    error,
    refetch,
  } = useCustomers(searchTerm);

  if (isLoading) return <div>Loading customers...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />

      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}

      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Why This Multi-Layer Approach?

1. **Local State**: Fast, simple, doesn't cause unnecessary re-renders
2. **Context**: Share data without "prop drilling" (passing props through many levels)
3. **React Query**: Automatic caching, background updates, error handling, loading states

---

## Data Fetching & API Integration

### API Client Setup

```tsx
// lib/api.ts
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh automatically
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await axios.post("/auth/refresh", { refreshToken });
          const newToken = response.data.accessToken;
          localStorage.setItem("accessToken", newToken);

          // Retry original request with new token
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### React Query Integration

```tsx
// Custom hooks for different resources
export function useCustomers(filters = {}) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const params = new URLSearchParams(filters);
      const response = await apiClient.get(`/customers?${params}`);
      return response.data;
    },
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData) => {
      const response = await apiClient.post("/customers", customerData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Component usage
function CustomersList() {
  const [filters, setFilters] = useState({ search: "", location: "" });

  const {
    data: customers,
    isLoading,
    error,
    isFetching, // Background refetch in progress
  } = useCustomers(filters);

  const createCustomerMutation = useCreateCustomer();

  const handleCreateCustomer = async (customerData) => {
    try {
      await createCustomerMutation.mutateAsync(customerData);
      // Success! List will automatically refresh
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {isFetching && <div className="opacity-50">Refreshing...</div>}

      {customers?.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}

      <CreateCustomerForm onSubmit={handleCreateCustomer} />
    </div>
  );
}
```

---

## Authentication System

### Authentication Flow

1. **User enters credentials** on login page
2. **Frontend sends** credentials to backend `/auth/login`
3. **Backend validates** credentials and returns tokens
4. **Frontend stores** tokens in localStorage
5. **All subsequent requests** include the access token
6. **When token expires**, frontend automatically refreshes it
7. **If refresh fails**, user is redirected to login

### Implementation

```tsx
// hooks/useAuth.tsx
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on app start
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        // Invalid user data, clear storage
        localStorage.clear();
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);

    const { accessToken, refreshToken, user } = response.data.data;

    // Store tokens and user data
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));

    setUser(user);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Protected route component
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
```

### Route Protection

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex">
        <Sidebar />
        <main className="flex-1">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
```

---

## Styling System

### Tailwind CSS Approach

Instead of writing custom CSS files, Tailwind provides utility classes:

```tsx
// Traditional CSS approach:
// styles.css
.customer-card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e5e5;
}

.customer-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

// Tailwind CSS approach:
<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md">
  {/* Customer content */}
</div>
```

### Component Styling Patterns

```tsx
// 1. Conditional classes based on state
function Button({ variant, disabled, children }) {
  const baseClasses = "px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2";

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  };

  const disabledClasses = disabled
    ? "opacity-50 cursor-not-allowed"
    : "";

  const className = `${baseClasses} ${variantClasses[variant]} ${disabledClasses}`;

  return <button className={className}>{children}</button>;
}

// 2. Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop */}
</div>

// 3. Dark mode support (when implemented)
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content that adapts to light/dark mode
</div>
```

### Global Styles

```css
/* app/globals.css */
@import "tailwindcss";

:root {
  --color-primary: #3b82f6; /* Blue-500 */
  --color-secondary: #64748b; /* Slate-500 */
  --color-success: #22c55e; /* Green-500 */
  --color-warning: #f59e0b; /* Amber-500 */
  --color-error: #ef4444; /* Red-500 */
}

/* Custom scrollbar for sidebar */
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}

.sidebar-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

/* Loading animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}
```

---

## User Experience Features

### 1. Loading States

The app provides comprehensive loading feedback:

```tsx
// Page navigation loading bar (automatic)
// Appears at top of screen when navigating between pages

// Modal loading overlay for async operations
function SaveCustomerButton({ customer, onSave }) {
  const { executeWithLoading } = useAsyncAction();

  const handleSave = () => {
    executeWithLoading(
      async () => {
        await apiClient.put(`/customers/${customer.id}`, customer);
        onSave();
      },
      "Saving customer..." // Loading message
    );
  };

  return <Button onClick={handleSave}>Save Changes</Button>;
}

// Component-level loading states
function CustomersList() {
  const { data, isLoading, isFetching } = useCustomers();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Skeleton loading animation */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={isFetching ? "opacity-50" : ""}>
      {/* Show dimmed content while background refresh happens */}
      {data.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

### 2. Form Validation

Real-time form validation with user-friendly error messages:

```tsx
// Using Zod for schema validation
const customerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Please enter a valid email address").optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, "Please enter a valid phone number")
    .optional(),
});

function CreateCustomerForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            {...register("companyName")}
            className={`block w-full rounded-md shadow-sm ${
              errors.companyName
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.companyName && (
            <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {errors.companyName.message}
            </p>
          )}
        </div>

        {/* More fields... */}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Customer"}
        </Button>
      </div>
    </form>
  );
}
```

### 3. Search and Filtering

Real-time search with debouncing to avoid excessive API calls:

```tsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ location: "", team: "" });

  // Debounce search to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: customers } = useCustomers({
    search: debouncedSearchTerm,
    ...filters,
  });

  return (
    <div>
      <div className="flex gap-4 mb-6">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customers..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />

        <select
          value={filters.location}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, location: e.target.value }))
          }
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Locations</option>
          <option value="lagos">Lagos</option>
          <option value="abuja">Abuja</option>
        </select>
      </div>

      <div className="grid gap-4">
        {customers?.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>
    </div>
  );
}
```

### 4. Modal Management

Centralized modal state management:

```tsx
function CustomersPage() {
  const [modals, setModals] = useState({
    createCustomer: false,
    editCustomer: null, // Store customer being edited
    viewCustomer: null, // Store customer being viewed
    recordPayment: null, // Store customer for payment
  });

  const openModal = (modalName, data = null) => {
    setModals((prev) => ({ ...prev, [modalName]: data || true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({
      ...prev,
      [modalName]: modalName.includes("Customer") ? null : false,
    }));
  };

  return (
    <div>
      {/* Page content with buttons to open modals */}
      <Button onClick={() => openModal("createCustomer")}>Add Customer</Button>

      {/* Conditionally render modals */}
      {modals.createCustomer && (
        <CreateCustomerModal
          isOpen={true}
          onClose={() => closeModal("createCustomer")}
          onSuccess={() => closeModal("createCustomer")}
        />
      )}

      {modals.editCustomer && (
        <EditCustomerModal
          customer={modals.editCustomer}
          isOpen={true}
          onClose={() => closeModal("editCustomer")}
        />
      )}
    </div>
  );
}
```

### 5. Responsive Design

The app works on all device sizes:

```tsx
// Mobile-first responsive classes
<div className="
  px-4 sm:px-6 lg:px-8          // Padding increases on larger screens
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3  // 1 col mobile, 2 tablet, 3 desktop
  text-sm sm:text-base          // Smaller text on mobile
  hidden sm:block               // Hide on mobile, show on tablet+
  sm:hidden                     // Show on mobile, hide on tablet+
">
```

---

## Why Things Are Built This Way

### 1. Why Single Page Application (SPA)?

**Traditional Multi-Page Application**:

- Each click = full page reload
- Server renders HTML for each page
- Slower navigation, page flickers

**Single Page Application**:

- Initial load downloads the "shell"
- Navigation updates content dynamically
- Feels like a desktop application
- Better user experience

### 2. Why Component-Based Architecture?

```tsx
// Instead of duplicating code:
function CustomerPage() {
  return (
    <div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Add Customer
      </button>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Edit Customer
      </button>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        Delete Customer
      </button>
    </div>
  );
}

// Create reusable components:
function Button({ children, onClick, variant = "primary" }) {
  return (
    <button
      className={`px-4 py-2 rounded ${
        variant === "primary"
          ? "bg-blue-500 text-white"
          : "bg-gray-500 text-white"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function CustomerPage() {
  return (
    <div>
      <Button onClick={addCustomer}>Add Customer</Button>
      <Button onClick={editCustomer}>Edit Customer</Button>
      <Button onClick={deleteCustomer} variant="danger">
        Delete Customer
      </Button>
    </div>
  );
}
```

**Benefits**:

- **Reusability**: Write once, use everywhere
- **Consistency**: All buttons look and behave the same
- **Maintainability**: Change button style in one place
- **Testing**: Test components in isolation

### 3. Why React Query for Data Fetching?

**Without React Query (complex)**:

```tsx
function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/customers")
      .then((response) => setCustomers(response.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, []);

  // Refetch function
  const refetch = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/customers");
      setCustomers(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle creating new customer
  const createCustomer = async (data) => {
    await apiClient.post("/customers", data);
    refetch(); // Manual refetch
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

**With React Query (simple)**:

```tsx
function CustomersList() {
  const {
    data: customers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers"],
    queryFn: () => apiClient.get("/customers").then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post("/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries(["customers"]); // Automatic refetch
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
}
```

**Benefits of React Query**:

- **Automatic caching**: Same data fetched once, used everywhere
- **Background updates**: Data stays fresh automatically
- **Optimistic updates**: UI updates immediately, syncs later
- **Error handling**: Consistent error states across the app
- **Loading states**: Automatic loading indicators
- **Deduplication**: Multiple components requesting same data = one request

### 4. Why TypeScript?

```javascript
// JavaScript (no type safety)
function createCustomer(customer) {
  return apiClient.post("/customers", customer);
}

// Oops! Typo in property name, runtime error
createCustomer({
  companyNme: "Acme Corp", // Should be "companyName"
  emai: "test@example.com", // Should be "email"
});
```

```typescript
// TypeScript (catches errors before runtime)
interface Customer {
  companyName: string;
  email?: string;
  phone?: string;
}

function createCustomer(customer: Customer) {
  return apiClient.post("/customers", customer);
}

// TypeScript error: Property 'companyNme' does not exist
createCustomer({
  companyNme: "Acme Corp", // ❌ Error caught at compile time
  emai: "test@example.com", // ❌ Error caught at compile time
});

// Correct usage
createCustomer({
  companyName: "Acme Corp", // ✅ Correct
  email: "test@example.com", // ✅ Correct
});
```

**Benefits**:

- **Catch errors early**: Before code reaches users
- **Better IDE support**: Auto-completion, refactoring
- **Self-documenting**: Types explain what functions expect
- **Refactoring safety**: Rename properties across entire codebase safely

### 5. Why Tailwind CSS?

**Traditional CSS Problems**:

```css
/* styles.css - gets very long and hard to maintain */
.customer-card {
  /* 50 lines of styles */
}
.customer-card--featured {
  /* 20 more lines */
}
.customer-card__header {
  /* 15 more lines */
}
.customer-card__body {
  /* 25 more lines */
}
/* ... hundreds more lines ... */
```

**Tailwind CSS Solution**:

```tsx
// Styles are co-located with components
<div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-gray-900">Customer Name</h3>
    <button className="text-blue-600 hover:text-blue-700">Edit</button>
  </div>
  <div className="text-gray-600">Customer details...</div>
</div>
```

**Benefits**:

- **No CSS files to maintain**: Styles are in the component
- **No naming conflicts**: No `.customer-card` vs `.customer__card` decisions
- **Better performance**: Only CSS you use is included in final build
- **Responsive by default**: `sm:`, `md:`, `lg:` prefixes for different screen sizes
- **Consistency**: Design system built into the utility classes

### 6. Why Form Libraries (React Hook Form + Zod)?

**Manual form handling (complex)**:

```tsx
function CreateCustomerForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.companyName) {
      newErrors.companyName = "Company name is required";
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await apiClient.post("/customers", formData);
      // Handle success
    } catch (error) {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.companyName}
        onChange={handleChange("companyName")}
      />
      {errors.companyName && <span>{errors.companyName}</span>}

      <input value={formData.email} onChange={handleChange("email")} />
      {errors.email && <span>{errors.email}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

**With React Hook Form + Zod (simple)**:

```tsx
const customerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email").optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, "Invalid phone")
    .optional(),
});

function CreateCustomerForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = async (data) => {
    await apiClient.post("/customers", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("companyName")} />
      {errors.companyName && <span>{errors.companyName.message}</span>}

      <input {...register("email")} />
      {errors.email && <span>{errors.email.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

**Benefits**:

- **Less code**: Library handles all the boilerplate
- **Better performance**: Only re-renders when necessary
- **Schema validation**: One source of truth for validation rules
- **Type safety**: Zod schemas generate TypeScript types
- **Better UX**: Validates as user types, not just on submit

---

## Performance Considerations

### 1. Code Splitting

Next.js automatically splits code by routes:

```tsx
// Each page is a separate JavaScript bundle
app / customers / page.tsx; // customers.js (loaded when visiting /customers)
app / invoices / page.tsx; // invoices.js (loaded when visiting /invoices)
app / dashboard / page.tsx; // dashboard.js (loaded when visiting /dashboard)
```

### 2. React Query Caching

```tsx
// Data is cached and shared between components
function CustomersList() {
  const { data } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function CustomerSummary() {
  // Same data, no additional API call
  const { data } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
}
```

### 3. Optimistic Updates

```tsx
function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCustomer,
    onMutate: async (updatedCustomer) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries(["customers"]);

      // Get current data
      const previousCustomers = queryClient.getQueryData(["customers"]);

      // Optimistically update
      queryClient.setQueryData(["customers"], (old) =>
        old.map((customer) =>
          customer.id === updatedCustomer.id ? updatedCustomer : customer
        )
      );

      return { previousCustomers };
    },
    onError: (err, updatedCustomer, context) => {
      // Rollback on error
      queryClient.setQueryData(["customers"], context.previousCustomers);
    },
  });
}
```

---

## Development Workflow

### 1. Adding a New Feature

1. **Create types** in `types/index.ts`
2. **Add API hook** in `hooks/`
3. **Create UI components** in `components/`
4. **Add page** in `app/feature-name/page.tsx`
5. **Update navigation** in `Sidebar.tsx`

### 2. Component Development Pattern

```tsx
// 1. Start with the interface
interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customerId: string) => void;
}

// 2. Build the basic component
export function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3>{customer.name}</h3>
      <p>{customer.email}</p>
    </div>
  );
}

// 3. Add interactivity
export function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3>{customer.name}</h3>
          <p>{customer.email}</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
          {onEdit && <Button onClick={() => onEdit(customer)}>Edit</Button>}
          {onDelete && (
            <Button variant="danger" onClick={() => onDelete(customer.id)}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          {/* Extended customer details */}
        </div>
      )}
    </div>
  );
}

// 4. Add to parent page
function CustomersPage() {
  const { data: customers } = useCustomers();
  const deleteCustomerMutation = useDeleteCustomer();

  const handleEdit = (customer) => {
    // Open edit modal
  };

  const handleDelete = async (customerId) => {
    if (confirm("Are you sure?")) {
      await deleteCustomerMutation.mutateAsync(customerId);
    }
  };

  return (
    <div className="space-y-4">
      {customers?.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
```

---

## Conclusion

This frontend architecture represents a modern, scalable approach to building business applications. Here's why each decision was made:

### Technical Decisions

1. **Next.js**: Production-ready React framework with excellent defaults
2. **TypeScript**: Prevents bugs and improves developer experience
3. **Tailwind CSS**: Faster development with consistent design
4. **React Query**: Powerful data fetching with caching and optimizations
5. **React Hook Form + Zod**: Best-in-class form handling with validation

### Architecture Benefits

1. **Maintainability**: Clear separation of concerns, reusable components
2. **Performance**: Code splitting, caching, optimistic updates
3. **User Experience**: Fast navigation, loading states, real-time feedback
4. **Developer Experience**: Type safety, hot reloading, excellent tooling
5. **Scalability**: Modular structure that grows with the business

### Real-World Impact

- **Users get** a fast, responsive application that feels native
- **Developers get** a codebase that's easy to understand and extend
- **Business gets** a system that can evolve with changing requirements
- **Maintenance teams get** clear patterns and excellent debugging tools

This frontend doesn't just display data - it creates an efficient, professional interface that makes Clyne Paper's team more productive and their business operations more effective. Every architectural decision serves the ultimate goal of creating software that real people use to do real work efficiently.

The complexity is justified because it solves real business problems: managing customers, tracking sales, processing payments, and providing insights - all while being fast, reliable, and pleasant to use.
