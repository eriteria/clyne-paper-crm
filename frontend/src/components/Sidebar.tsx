import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FileText,
  Users,
  UserCheck,
  Settings,
  LogOut,
  Building2,
  Calculator,
  Shield,
  Menu,
  ChevronLeft,
  UsersIcon,
  ShoppingCart,
  CreditCard,
  BarChart3,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { usePermissions } from "@/hooks/usePermissions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null }, // Always visible
  { name: "Customers", href: "/customers", icon: UserCheck, permission: "customers:view" },
  { name: "Products", href: "/products", icon: ShoppingCart, permission: "products:view" },
  { name: "Inventory", href: "/inventory", icon: Package, permission: "inventory:view" },
  { name: "Invoices", href: "/invoices", icon: FileText, permission: "invoices:view" },
  { name: "Sales Returns", href: "/sales-returns", icon: RotateCcw, permission: "returns:view" },
  { name: "Payments", href: "/payments", icon: CreditCard, permission: "payments:view" },
  { name: "Financial", href: "/financial", icon: Calculator, permission: "reports:view_financial" },
  { name: "Reports", href: "/reports", icon: BarChart3, permission: "reports:view_dashboard" },
  { name: "Users", href: "/users", icon: Users, permission: "users:view" },
  { name: "Teams", href: "/teams", icon: UsersIcon, permission: "teams:view" },
  { name: "Settings", href: "/settings", icon: Settings, permission: null }, // Always visible
];

// Admin-only navigation items (require any roles permission)
const adminNavigation = [
  { name: "Administration", href: "/admin", icon: Shield, permission: "roles:view" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { hasPermission } = usePermissions();

  const handleLogout = () => {
    logout();
  };

  // Filter navigation items based on permissions
  const visibleNavigation = navigation.filter((item) => {
    // If no permission required, always show
    if (item.permission === null) return true;
    // Otherwise check if user has the permission
    return hasPermission(item.permission);
  });

  const visibleAdminNavigation = adminNavigation.filter((item) => {
    if (item.permission === null) return true;
    return hasPermission(item.permission);
  });

  return (
    <div
      className={`bg-white shadow-lg h-screen fixed left-0 top-0 z-40 transition-all duration-300 flex flex-col ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Clyne Paper</h1>
              <p className="text-xs text-gray-500">CRM System</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex items-center justify-center w-full">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
        >
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        {isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-shadow"
          >
            <Menu className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Navigation - Scrollable */}
      <nav
        className={`flex-1 overflow-y-auto mt-6 ${
          isCollapsed ? "px-2" : "px-3"
        } pb-4 sidebar-scroll`}
      >
        <div className="space-y-1">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ""}
                className={`
                  group flex items-center ${
                    isCollapsed ? "justify-center px-2" : "px-3"
                  } py-2 text-sm font-medium rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <item.icon
                  className={`
                    ${isCollapsed ? "" : "mr-3"} h-5 w-5 transition-colors
                    ${
                      isActive
                        ? "text-blue-500"
                        : "text-gray-400 group-hover:text-gray-500"
                    }
                  `}
                />
                {!isCollapsed && <span className="flex-1">{item.name}</span>}
              </Link>
            );
          })}

          {/* Admin navigation - shown only if user has permissions */}
          {visibleAdminNavigation.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="border-t border-gray-200 my-4"></div>
              )}
              {isCollapsed && (
                <div className="border-t border-gray-200 my-2"></div>
              )}
              {visibleAdminNavigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    title={isCollapsed ? item.name : ""}
                    className={`
                      group flex items-center ${
                        isCollapsed ? "justify-center px-2" : "px-3"
                      } py-2 text-sm font-medium rounded-lg transition-colors
                      ${
                        isActive
                          ? "bg-red-50 border-red-500 text-red-700"
                          : "text-gray-700 hover:bg-red-50 hover:text-red-900"
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        ${isCollapsed ? "" : "mr-3"} h-5 w-5 transition-colors
                        ${
                          isActive
                            ? "text-red-500"
                            : "text-gray-400 group-hover:text-red-500"
                        }
                      `}
                    />
                    {!isCollapsed && (
                      <span className="flex-1">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </nav>

      {/* User Profile & Logout - Fixed at bottom */}
      <div
        className={`border-t border-gray-200 flex-shrink-0 ${
          isCollapsed ? "p-2" : "p-4"
        }`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center mb-2">
            <div className="bg-blue-100 rounded-full p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Sign out" : ""}
          className={`w-full flex items-center ${
            isCollapsed ? "justify-center px-2" : "gap-2 px-3"
          } py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors`}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}
