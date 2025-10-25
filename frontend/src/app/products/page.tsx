"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  BarChart3,
  Upload,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { useRouter } from "next/navigation";

interface ProductGroup {
  id: string;
  name: string;
  productCount: number;
  analytics?: {
    totalTarget: number;
    totalMonthlySales: number;
    totalSales: number;
    targetProgress: number;
    productPerformance: ProductPerformance[];
  };
}

interface ProductPerformance {
  id: string;
  name: string;
  monthlyTarget: number;
  monthlySales: number;
  totalSales: number;
  targetProgress: number;
}

interface Product {
  id: string;
  name: string;
  productGroupId: string;
  monthlyTarget: number;
  monthlySales?: number;
  totalSales?: number;
  targetProgress?: number;
  productGroup: {
    id: string;
    name: string;
  };
}

export default function ProductsPage() {
  const { hasPermission } = usePermissions();
  const router = useRouter();

  // Check if user has permission to view products
  if (!hasPermission("products:view")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <div className="mb-4">
            <Package className="h-16 w-16 text-red-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to view products.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"products" | "groups">(
    "products"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const queryClient = useQueryClient();

  // Fetch product groups
  const { data: productGroupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["product-groups"],
    queryFn: async () => {
      console.log("Fetching product groups...");
      const response = await apiClient.get(
        "/product-groups?includeAnalytics=true"
      );
      console.log("Product groups response:", response.data);
      return response.data;
    },
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchTerm, selectedGroupId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedGroupId) params.append("groupId", selectedGroupId);

      const response = await apiClient.get(`/products?${params.toString()}`);
      return response.data;
    },
  });

  const productGroups: ProductGroup[] = productGroupsData?.data || [];
  const products: Product[] = productsData?.data?.products || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your tissue paper products and track unit sales targets vs
              performance
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Products
            </button>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </button>
            <button
              onClick={() => setShowCreateProductModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab("products")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === "products"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Products
            </button>
            <button
              onClick={() => setSelectedTab("groups")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === "groups"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Product Groups
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="px-6">
        {selectedTab === "products" && (
          <ProductsTab
            products={products}
            productGroups={productGroups}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            loading={productsLoading}
          />
        )}

        {selectedTab === "groups" && (
          <ProductGroupsTab
            productGroups={productGroups}
            loading={groupsLoading}
          />
        )}
      </div>

      {/* Modals */}
      {showCreateProductModal && (
        <CreateProductModal
          isOpen={showCreateProductModal}
          onClose={() => setShowCreateProductModal(false)}
          productGroups={productGroups}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}

      {showImportModal && (
        <ImportProductsModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  );
}

// Products Tab Component
function ProductsTab({
  products,
  productGroups,
  searchTerm,
  setSearchTerm,
  selectedGroupId,
  setSelectedGroupId,
  loading,
}: {
  products: Product[];
  productGroups: ProductGroup[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  loading: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat("en-NG").format(quantity);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="w-48">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
          >
            <option value="">All Groups</option>
            {productGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              formatCurrency={formatCurrency}
              formatQuantity={formatQuantity}
              getProgressColor={getProgressColor}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No products found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedGroupId
              ? "Try adjusting your filters"
              : "Get started by creating a new product"}
          </p>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  formatCurrency,
  formatQuantity,
  getProgressColor,
}: {
  product: Product;
  formatCurrency: (amount: number) => string;
  formatQuantity: (quantity: number) => string;
  getProgressColor: (progress: number) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {product.productGroup.name}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly Target:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatQuantity(product.monthlyTarget)} units
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Units Sold This Month:
              </span>
              <span className="text-sm font-medium text-gray-900">
                {formatQuantity(product.monthlySales || 0)} units
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress:</span>
                <span className="text-sm font-medium text-gray-900">
                  {(product.targetProgress || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor(
                    product.targetProgress || 0
                  )}`}
                  style={{
                    width: `${Math.min(product.targetProgress || 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-2 ml-4">
          <button className="p-2 text-gray-400 hover:text-blue-600">
            <Edit className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Product Groups Tab Component
function ProductGroupsTab({
  productGroups,
  loading,
}: {
  productGroups: ProductGroup[];
  loading: boolean;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  const formatQuantity = (quantity: number) => {
    return new Intl.NumberFormat("en-NG").format(quantity);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : productGroups.length > 0 ? (
        <div className="space-y-6">
          {productGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {group.name}
                </h3>
                <span className="text-sm text-gray-500">
                  {group.productCount}{" "}
                  {group.productCount === 1 ? "product" : "products"}
                </span>
              </div>

              {group.analytics && (
                <>
                  {/* Group Analytics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatQuantity(group.analytics.totalTarget)} units
                      </div>
                      <div className="text-sm text-gray-600">
                        Monthly Target
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatQuantity(group.analytics.totalMonthlySales)}{" "}
                        units
                      </div>
                      <div className="text-sm text-gray-600">
                        Units Sold This Month
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(group.analytics.totalSales)}
                      </div>
                      <div className="text-sm text-gray-600">All Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {group.analytics.targetProgress.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        Target Progress
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(
                            group.analytics.targetProgress
                          )}`}
                          style={{
                            width: `${Math.min(
                              group.analytics.targetProgress,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Performance in Group */}
                  {group.analytics.productPerformance.length > 0 && (
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Product Performance
                      </h4>
                      <div className="space-y-3">
                        {group.analytics.productPerformance.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatQuantity(product.monthlySales)} /{" "}
                                {formatQuantity(product.monthlyTarget)} units
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.targetProgress.toFixed(1)}%
                              </div>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getProgressColor(
                                    product.targetProgress
                                  )}`}
                                  style={{
                                    width: `${Math.min(
                                      product.targetProgress,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No product groups
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new product group
          </p>
        </div>
      )}
    </div>
  );
}

// Create Product Modal
function CreateProductModal({
  isOpen,
  onClose,
  productGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  productGroups: ProductGroup[];
}) {
  const [formData, setFormData] = useState({
    name: "",
    productGroupId: "",
    monthlyTarget: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post("/products", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      onClose();
      setFormData({ name: "", productGroupId: "", monthlyTarget: "" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.productGroupId) return;

    setIsSubmitting(true);
    try {
      await createProductMutation.mutateAsync({
        name: formData.name,
        productGroupId: formData.productGroupId,
        monthlyTarget: Number(formData.monthlyTarget) || 0,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Create New Product
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Group *
              </label>
              <select
                value={formData.productGroupId}
                onChange={(e) =>
                  setFormData({ ...formData, productGroupId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                required
              >
                <option value="">Select a product group</option>
                {productGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Target (Units)
              </label>
              <input
                type="number"
                value={formData.monthlyTarget}
                onChange={(e) =>
                  setFormData({ ...formData, monthlyTarget: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || !formData.name || !formData.productGroupId
                }
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Create Group Modal
function CreateGroupModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiClient.post("/product-groups", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      onClose();
      setGroupName("");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsSubmitting(true);
    try {
      await createGroupMutation.mutateAsync({ name: groupName.trim() });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Create Product Group
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                placeholder="Enter group name (e.g., Tissue Papers)"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !groupName.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Import Products Modal
function ImportProductsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [csvData, setCsvData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const queryClient = useQueryClient();

  const importProductsMutation = useMutation({
    mutationFn: async (products: any[]) => {
      const response = await apiClient.post("/products/import", { products });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      setImportResults(data.data);
    },
  });

  const handleImport = async () => {
    if (!csvData.trim()) return;

    setIsSubmitting(true);
    try {
      // Parse CSV data
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());

      const products = lines
        .slice(1)
        .map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const product: any = {};

          headers.forEach((header, index) => {
            const key = header.toLowerCase().replace(/\s+/g, "");
            if (key === "productname" || key === "name") {
              product.name = values[index];
            } else if (key === "productgroup" || key === "group") {
              product.productGroupName = values[index];
            } else if (key === "monthlytarget" || key === "target") {
              product.monthlyTarget = Number(values[index]) || 0;
            }
          });

          return product;
        })
        .filter((p) => p.name && p.productGroupName);

      await importProductsMutation.mutateAsync(products);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCsvData("");
    setImportResults(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Import Products
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {!importResults ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSV Data
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Expected format: Name, Product Group, Monthly Target (units -
                  one product per line)
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Example:
                  <br />
                  Product Name, Product Group, Monthly Target
                  <br />
                  Premium Toilet Paper, Tissue Papers, 50000
                  <br />
                  Napkins, Tissue Papers, 30000
                </p>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Paste your CSV data here..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isSubmitting || !csvData.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Importing..." : "Import Products"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">
                Import Results
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResults.created}
                  </div>
                  <div className="text-sm text-green-700">Products Created</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {importResults.updated}
                  </div>
                  <div className="text-sm text-blue-700">Products Updated</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResults.errors.length}
                  </div>
                  <div className="text-sm text-red-700">Errors</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Errors:</h5>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResults.errors.map((error: any, index: number) => (
                      <div
                        key={index}
                        className="text-sm text-red-600 bg-red-50 p-2 rounded"
                      >
                        {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
