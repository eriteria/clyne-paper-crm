"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Phone,
  Building,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Award,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";
import Badge from "@/components/Badge";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: {
    name: string;
  };
  team?: {
    name: string;
    region?: {
      name: string;
    };
  };
  isActive: boolean;
  createdAt: string;
}

interface SystemSettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  currency: string;
  timezone: string;
  language: string;
  taxRate: number;
  lowStockThreshold: number;
  backupEnabled: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Profile form state
  const [profileFormData, setProfileFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  const queryClient = useQueryClient();
  const { counts, meta, refresh: refreshNotifications } = useNotifications();

  // Fetch user profile
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await apiClient.get("/auth/profile");
      return response.data;
    },
  });

  // Fetch system settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const response = await apiClient.get("/settings");
      return response.data;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiClient.patch("/auth/profile", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      const response = await apiClient.patch("/auth/change-password", data);
      return response.data;
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordForm(false);
    },
  });

  // Update system settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      const response = await apiClient.patch("/settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
  });

  const profile: UserProfile = profileData?.data;
  const settings: SystemSettings = settingsData?.data || {
    companyName: "Clyne Paper Ltd",
    companyEmail: "info@clynepaper.com",
    companyPhone: "+234-XXX-XXX-XXXX",
    companyAddress: "Lagos, Nigeria",
    currency: "NGN",
    timezone: "Africa/Lagos",
    language: "en",
    taxRate: 7.5,
    lowStockThreshold: 10,
    backupEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
  };

  // Initialize profile form data when profile loads
  React.useEffect(() => {
    if (profile) {
      setProfileFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile]);

  // Handle profile form changes
  const handleProfileFormChange = (field: string, value: string) => {
    setProfileFormData((prev) => ({ ...prev, [field]: value }));
    setHasProfileChanges(true);
  };

  // Handle profile form submit
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileFormData);
    setHasProfileChanges(false);
  };

  const tabs = [
    { id: "profile", name: "Profile", icon: User },
    { id: "company", name: "Company", icon: Building },
    { id: "notifications", name: "Notifications", icon: Bell },
    { id: "badges", name: "Badges", icon: Award },
    { id: "data", name: "Data Management", icon: Database },
    { id: "security", name: "Security", icon: Shield },
    { id: "system", name: "System", icon: Settings },
  ];

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    updatePasswordMutation.mutate(passwordData);
  };

  const handleSettingsUpdate = (
    field: string,
    value: string | number | boolean
  ) => {
    updateSettingsMutation.mutate({ [field]: value });
  };

  if (profileLoading || settingsLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-900 font-medium">
          Loading settings...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account and system preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-64">
          <div className="bg-white rounded-lg shadow">
            <nav className="p-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
                      activeTab === tab.id
                        ? "bg-blue-50 text-blue-600 border-l-4 border-blue-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Profile Information
                </h2>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileFormData.fullName}
                        onChange={(e) =>
                          handleProfileFormChange("fullName", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileFormData.email}
                        onChange={(e) =>
                          handleProfileFormChange("email", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        placeholder="Enter your email address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileFormData.phone}
                        onChange={(e) =>
                          handleProfileFormChange("phone", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={profile?.role?.name || "N/A"}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team
                      </label>
                      <input
                        type="text"
                        value={profile?.team?.name || "Unassigned"}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Region
                      </label>
                      <input
                        type="text"
                        value={profile?.team?.region?.name || "N/A"}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      {updateProfileMutation.isPending && (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-600">
                            Updating profile...
                          </span>
                        </>
                      )}
                      {updateProfileMutation.isSuccess &&
                        !hasProfileChanges && (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">
                              Profile updated successfully!
                            </span>
                          </>
                        )}
                      {updateProfileMutation.isError && (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">
                            Failed to update profile
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (profile) {
                            setProfileFormData({
                              fullName: profile.fullName || "",
                              email: profile.email || "",
                              phone: profile.phone || "",
                            });
                            setHasProfileChanges(false);
                          }
                        }}
                        disabled={!hasProfileChanges}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        disabled={
                          !hasProfileChanges || updateProfileMutation.isPending
                        }
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Save className="h-4 w-4" />
                        Save Changes
                      </button>
                    </div>
                  </div>
                </form>

                {/* Password Change Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Password
                    </h3>
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Change Password
                    </button>
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                current: !showPasswords.current,
                              })
                            }
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.current ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                new: !showPasswords.new,
                              })
                            }
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.new ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                confirm: !showPasswords.confirm,
                              })
                            }
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={updatePasswordMutation.isPending}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                          <Save className="h-4 w-4" />
                          Update Password
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPasswordForm(false)}
                          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Company Tab */}
            {activeTab === "company" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Company Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue={settings.companyName}
                      onBlur={(e) =>
                        handleSettingsUpdate("companyName", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Email
                    </label>
                    <input
                      type="email"
                      defaultValue={settings.companyEmail}
                      onBlur={(e) =>
                        handleSettingsUpdate("companyEmail", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Phone
                    </label>
                    <input
                      type="tel"
                      defaultValue={settings.companyPhone}
                      onBlur={(e) =>
                        handleSettingsUpdate("companyPhone", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      defaultValue={settings.currency}
                      onChange={(e) =>
                        handleSettingsUpdate("currency", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="NGN">Nigerian Naira (₦)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                      <option value="GBP">British Pound (£)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Address
                    </label>
                    <textarea
                      defaultValue={settings.companyAddress}
                      onBlur={(e) =>
                        handleSettingsUpdate("companyAddress", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={settings.taxRate}
                      onBlur={(e) =>
                        handleSettingsUpdate(
                          "taxRate",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      defaultValue={settings.lowStockThreshold}
                      onBlur={(e) =>
                        handleSettingsUpdate(
                          "lowStockThreshold",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Notification Preferences
                </h2>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Email Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receive updates via email
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) =>
                          handleSettingsUpdate(
                            "emailNotifications",
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-green-600" />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          SMS Notifications
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receive alerts via SMS
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) =>
                          handleSettingsUpdate(
                            "smsNotifications",
                            e.target.checked
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Badges Tab */}
            {activeTab === "badges" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Notification Badges
                  </h2>
                  <button
                    onClick={refreshNotifications}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-blue-800">
                          About Notification Badges
                        </h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Badges appear on navigation items to alert you about
                          items that need your attention, such as overdue
                          invoices, low stock alerts, and pending approvals.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badge Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      {
                        key: "dashboard",
                        name: "Dashboard",
                        description: "Overall system alerts",
                        count: counts.dashboard,
                        details: `${meta.overdueInvoices} overdue invoices, ${meta.lowStockItems} low stock items`,
                      },
                      {
                        key: "customers",
                        name: "Customers",
                        description: "Pending customer approvals",
                        count: counts.customers,
                        details: `${meta.pendingCustomers} customers pending approval`,
                      },
                      {
                        key: "inventory",
                        name: "Inventory",
                        description: "Low stock alerts",
                        count: counts.inventory,
                        details: `${meta.lowStockItems} items below threshold`,
                      },
                      {
                        key: "invoices",
                        name: "Invoices",
                        description: "Overdue and upcoming due invoices",
                        count: counts.invoices,
                        details: `${meta.overdueInvoices} overdue, ${meta.upcomingDueInvoices} due soon`,
                      },
                      {
                        key: "payments",
                        name: "Payments",
                        description: "Available customer credits",
                        count: counts.payments,
                        details: `${meta.availableCredits} available credits`,
                      },
                      {
                        key: "users",
                        name: "Users",
                        description: "Inactive user accounts",
                        count: counts.users,
                        details: `${meta.inactiveUsers} inactive users`,
                      },
                    ].map((module) => (
                      <div
                        key={module.key}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">
                            {module.name}
                          </h3>
                          {module.count > 0 && (
                            <Badge
                              count={module.count}
                              variant={
                                module.key === "payments"
                                  ? "success"
                                  : module.count > 5
                                  ? "danger"
                                  : module.count > 0
                                  ? "warning"
                                  : "default"
                              }
                            />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {module.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {module.details}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Badge Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Badge Settings
                    </h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Auto-refresh badges
                          </h4>
                          <p className="text-sm text-gray-600">
                            Automatically update notification counts every
                            minute
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Show animated badges
                          </h4>
                          <p className="text-sm text-gray-600">
                            Add subtle animation to draw attention to badges
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={true}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === "data" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Data Management
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        /* Refresh handler */
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Warning Notice */}
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-red-800">
                          Important Notice
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          Data management operations can have significant impact
                          on your system. Only authorized administrators should
                          perform these actions. Always create backups before
                          importing or modifying data.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Export Data Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Download className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Export Data
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Export your system data for backup or transfer purposes.
                      You can select specific data types to export.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {[
                        "customers",
                        "products",
                        "invoices",
                        "payments",
                        "users",
                      ].map((table) => (
                        <label key={table} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 capitalize">
                            {table}
                          </span>
                        </label>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        // Export data logic
                        window.open(
                          "/api/data-management/export?tables=all",
                          "_blank"
                        );
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Download className="h-4 w-4" />
                      Export Data
                    </button>
                  </div>

                  {/* Import Data Section */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Upload className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-medium text-gray-900">
                        Import Data
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Import data from a previously exported file. The system
                      will validate the data format and structure.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Import File
                        </label>
                        <input
                          type="file"
                          accept=".json"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="allowDuplicates"
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor="allowDuplicates"
                          className="text-sm text-gray-700"
                        >
                          Allow duplicate records (skip duplicate checking)
                        </label>
                      </div>

                      <button
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled
                      >
                        <Upload className="h-4 w-4" />
                        Import Data
                      </button>
                    </div>
                  </div>

                  {/* Backup & Maintenance Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Manual Backup */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Database className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-medium text-gray-900">
                          Create Backup
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Create a manual backup of your entire system data.
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Backup:</span>
                          <span className="text-gray-900">3 days ago</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Backup Size:</span>
                          <span className="text-gray-900">~25 MB</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.post("/data-management/backup");
                            alert("Backup created successfully!");
                          } catch {
                            alert("Failed to create backup");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                      >
                        <Database className="h-4 w-4" />
                        Create Backup
                      </button>
                    </div>

                    {/* Clear Cache */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Trash2 className="h-5 w-5 text-orange-600" />
                        <h3 className="text-lg font-medium text-gray-900">
                          Clear Cache
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Clear application cache to improve performance and
                        resolve data issues.
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cache Size:</span>
                          <span className="text-gray-900">~12 MB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Last Cleared:</span>
                          <span className="text-gray-900">1 week ago</span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            await apiClient.delete(
                              "/data-management/clear-cache"
                            );
                            alert("Cache cleared successfully!");
                          } catch {
                            alert("Failed to clear cache");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear Cache
                      </button>
                    </div>
                  </div>

                  {/* System Statistics */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      System Statistics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          1,234
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Customers
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          456
                        </div>
                        <div className="text-sm text-gray-600">Products</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          7,890
                        </div>
                        <div className="text-sm text-gray-600">Invoices</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ₦2.1M
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Revenue
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Security Settings
                </h2>

                <div className="space-y-6">
                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-yellow-800">
                          Account Security
                        </h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your account is secured with password authentication.
                          Consider enabling two-factor authentication for
                          enhanced security.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Last Login
                      </h3>
                      <p className="text-sm text-gray-600">
                        {profile?.createdAt
                          ? new Date(profile.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">
                        Account Status
                      </h3>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && (
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  System Settings
                </h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      <select
                        defaultValue={settings.timezone}
                        onChange={(e) =>
                          handleSettingsUpdate("timezone", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">
                          America/New_York (EST)
                        </option>
                        <option value="Europe/London">
                          Europe/London (GMT)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        defaultValue={settings.language}
                        onChange={(e) =>
                          handleSettingsUpdate("language", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      >
                        <option value="en">English</option>
                        <option value="yo">Yoruba</option>
                        <option value="ig">Igbo</option>
                        <option value="ha">Hausa</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Data Management
                    </h3>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-4">
                      <div className="flex items-center gap-3">
                        <Database className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Automatic Backups
                          </h4>
                          <p className="text-sm text-gray-600">
                            Daily automated data backups
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.backupEnabled}
                          onChange={(e) =>
                            handleSettingsUpdate(
                              "backupEnabled",
                              e.target.checked
                            )
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        <Download className="h-4 w-4" />
                        Export Data
                      </button>
                      <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                        <Upload className="h-4 w-4" />
                        Import Data
                      </button>
                      <button className="flex items-center justify-center gap-2 p-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
                        <Trash2 className="h-4 w-4" />
                        Clear Cache
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-blue-800">
                            System Information
                          </h3>
                          <div className="text-sm text-blue-700 mt-2 space-y-1">
                            <p>CRM Version: 1.0.0</p>
                            <p>Database: PostgreSQL</p>
                            <p>
                              Last Updated: {new Date().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
