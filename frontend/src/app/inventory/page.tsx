"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Package, Search, Trash2, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "@/contexts/LocationContext";
import LocationSelector from "@/components/LocationSelector";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description?: string;
  category: string;
  unitPrice: number;
  currentQuantity: number;
  minStock: number;
  locationId: string;
  location?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const { selectedLocationId } = useLocation();

  const queryClient = useQueryClient();
  const router = useRouter();

  // Fetch inventory items
  const {
    data: inventoryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "inventory",
      searchTerm,
      filterCategory,
      filterStatus,
      selectedLocationId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterCategory) params.append("category", filterCategory);
      if (filterStatus) params.append("status", filterStatus);
      if (selectedLocationId) params.append("locationId", selectedLocationId);

      const response = await apiClient.get(`/inventory?${params}`);
      return response.data;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/inventory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentQuantity === 0)
      return { status: "Out of Stock", color: "text-red-600 bg-red-50" };
    if (item.currentQuantity <= item.minStock)
      return { status: "Low Stock", color: "text-yellow-600 bg-yellow-50" };
    return { status: "In Stock", color: "text-green-600 bg-green-50" };
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 text-center">
          <p>Error loading inventory: {error.message}</p>
        </div>
      </div>
    );
  }

  const inventory = Array.isArray(inventoryData?.data?.items)
    ? inventoryData.data.items
    : [];
  const categories: string[] = [];

  const filteredInventory = inventory.filter((item: InventoryItem) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesStatus =
      !filterStatus ||
      (filterStatus === "low-stock" && item.currentQuantity <= item.minStock) ||
      (filterStatus === "in-stock" && item.currentQuantity > item.minStock) ||
      (filterStatus === "out-of-stock" && item.currentQuantity === 0);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-6">
      {/* Location Selector */}
      <LocationSelector />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 mt-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Inventory Management
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Manage your tissue paper products. Add new items by creating a
            waybill.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => router.push("/waybills?create=true")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Log Waybill
          </button>
          <p className="text-xs text-gray-500 text-right max-w-xs">
            Add inventory items by logging a waybill for received goods
          </p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              How to Add Inventory Items
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Inventory items are added automatically when you log and process
              waybills. Log a waybill for goods received from suppliers, and the
              system will add the items to your inventory.
            </p>
            <button
              onClick={() => router.push("/waybills")}
              className="text-sm text-blue-800 hover:text-blue-900 underline mt-2"
            >
              Go to Waybill Management →
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search items..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            <Package className="h-4 w-4 mr-2" />
            {filteredInventory.length} items
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInventory.map((item: InventoryItem) => {
                const stockStatus = getStockStatus(item);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          SKU: {item.sku}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.currentQuantity} units
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {item.minStock}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}
                      >
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.location?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInventory.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No inventory items
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add inventory items by logging a waybill for received goods.
            </p>
            <button
              onClick={() => router.push("/waybills")}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 mx-auto"
            >
              <FileText className="h-4 w-4" />
              Log Your First Waybill
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
