"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { locationService } from "@/lib/services/locationService";
import { waybillService } from "@/lib/services/waybillService";
import { productsService } from "@/lib/services/products";
import { Location, Product } from "@/types";
import { Waybill, CreateWaybillRequest } from "@/types/waybill";
import { toast } from "@/lib/toast";

interface FormWaybillItem {
  productId: string; // ID of selected product
  sku: string;
  name: string;
  description: string;
  unit: string;
  quantityShipped: number;
  quantityReceived: number;
  unitCost: number;
  notes: string;
}

interface WaybillFormProps {
  onSubmit?: (waybill: Waybill) => void;
  onCancel?: () => void;
  initialData?: Partial<Waybill>;
  isEdit?: boolean;
}

export default function WaybillForm({
  onSubmit,
  onCancel,
  initialData,
  isEdit = false,
}: WaybillFormProps) {
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    waybillNumber: initialData?.waybillNumber || "",
    supplierName: initialData?.supplier || "",
    supplierContact: "", // This field is for creation only, not stored in Waybill
    locationId: initialData?.locationId || "",
    notes: initialData?.notes || "",
    items:
      initialData?.items?.map((item) => ({
        productId: "", // Will be populated from existing data
        sku: item.sku,
        name: item.name,
        description: item.description || "",
        unit: item.unit,
        quantityShipped: 0, // Add this field to WaybillItem interface
        quantityReceived: item.quantityReceived,
        unitCost: item.unitCost,
        notes: "", // Add this field to WaybillItem interface
      })) ||
      ([
        {
          productId: "",
          sku: "",
          name: "",
          description: "",
          unit: "",
          quantityShipped: 0,
          quantityReceived: 0,
          unitCost: 0,
          notes: "",
        },
      ] as FormWaybillItem[]),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadLocations();
    loadProducts();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await locationService.getAll();
      setLocations(response || []);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Failed to load locations");
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsService.getAllProducts();
      setProducts(response || []);

      if (!response || response.length === 0) {
        toast.info("No products found. Please add some products first.");
      }
    } catch (error: unknown) {
      console.error("Error loading products:", error);

      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }

      // Check if it's an axios error
      if (error && typeof error === "object" && "response" in error) {
        const response = (error as { response?: { status?: number } }).response;
        if (response?.status === 401) {
          toast.error("Authentication required. Please log in again.");
        } else if (response?.status === 403) {
          toast.error(
            "Access denied. You don't have permission to view inventory."
          );
        } else {
          toast.error("Failed to load inventory items. Please try again.");
        }
      } else {
        toast.error("Failed to load inventory items. Please try again.");
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.waybillNumber.trim()) {
      newErrors.waybillNumber = "Waybill number is required";
    }

    if (!formData.supplierName.trim()) {
      newErrors.supplierName = "Supplier name is required";
    }

    if (!formData.locationId) {
      newErrors.locationId = "Location is required";
    }

    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`items.${index}.product`] = "Product selection is required";
      }
      if (item.quantityShipped <= 0) {
        newErrors[`items.${index}.quantityShipped`] =
          "Quantity shipped must be greater than 0";
      }
      if (item.quantityReceived < 0) {
        newErrors[`items.${index}.quantityReceived`] =
          "Quantity received cannot be negative";
      }
    });

    if (formData.items.length === 0) {
      newErrors.items = "At least one item is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);

    try {
      const waybillData: CreateWaybillRequest = {
        waybillNumber: formData.waybillNumber,
        supplierName: formData.supplierName,
        supplierContact: formData.supplierContact,
        locationId: formData.locationId,
        notes: formData.notes,
        items: formData.items.map((item) => ({
          sku: item.sku,
          name: item.name,
          description: item.description,
          unit: item.unit,
          quantityShipped: item.quantityShipped,
          quantityReceived: item.quantityReceived,
          unitCost: item.unitCost,
          notes: item.notes,
          productId: item.productId, // Include for backend processing
        })),
      };

      let result;
      if (isEdit && initialData?.id) {
        result = await waybillService.update(initialData.id, waybillData);
        toast.success("Waybill updated successfully");
      } else {
        result = await waybillService.create(waybillData);
        toast.success("Waybill created successfully");
      }

      onSubmit?.(result);
    } catch (error: unknown) {
      console.error("Error saving waybill:", error);
      const errorMessage =
        error instanceof Error &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "error" in error.response.data
          ? String(error.response.data.error)
          : "Failed to save waybill";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: "",
          sku: "",
          name: "",
          description: "",
          unit: "",
          quantityShipped: 0,
          quantityReceived: 0,
          unitCost: 0,
          notes: "",
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }));
    }
  };

  const updateItem = (
    index: number,
    field: keyof FormWaybillItem,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleProductSelection = (index: number, productId: string) => {
    const selectedProduct = products.find(
      (product) => product.id === productId
    );
    if (selectedProduct) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === index
            ? {
                ...item,
                productId: selectedProduct.id,
                sku: selectedProduct.name, // Products don't have SKU field, use name
                name: selectedProduct.name,
                description: selectedProduct.productGroup?.name || "",
                unit: "pcs", // Default unit - you might want to add this to Product model
                unitCost: 0, // Default - user will need to enter this
              }
            : item
        ),
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEdit ? "Edit Waybill" : "Create New Waybill"}
            {isEdit && initialData?.status && (
              <Badge
                variant={
                  initialData.status === "COMPLETED"
                    ? "default"
                    : initialData.status === "PROCESSING"
                    ? "secondary"
                    : initialData.status === "REVIEW"
                    ? "destructive"
                    : "outline"
                }
              >
                {initialData.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waybillNumber">Waybill Number *</Label>
                <Input
                  id="waybillNumber"
                  value={formData.waybillNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      waybillNumber: e.target.value,
                    }))
                  }
                  placeholder="Enter waybill number"
                  className={errors.waybillNumber ? "border-red-500" : ""}
                />
                {errors.waybillNumber && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.waybillNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierName: e.target.value,
                    }))
                  }
                  placeholder="Enter supplier name"
                  className={errors.supplierName ? "border-red-500" : ""}
                />
                {errors.supplierName && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.supplierName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierContact">Supplier Contact</Label>
                <Input
                  id="supplierContact"
                  value={formData.supplierContact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supplierContact: e.target.value,
                    }))
                  }
                  placeholder="Enter supplier contact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Destination Location *</Label>
                <Select
                  value={formData.locationId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFormData((prev) => ({
                      ...prev,
                      locationId: e.target.value,
                    }))
                  }
                  className={errors.locationId ? "border-red-500" : ""}
                >
                  <SelectItem value="">Select location</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </Select>
                {errors.locationId && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.locationId}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Waybill Items
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {errors.items && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.items}
                </p>
              )}

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-medium text-gray-900">
                        Item {index + 1}
                      </h4>
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Select Product *</Label>
                        <Select
                          value={item.productId}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleProductSelection(index, e.target.value)
                          }
                          className={
                            errors[`items.${index}.product`]
                              ? "border-red-500"
                              : ""
                          }
                        >
                          <SelectItem value="">Choose a product...</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} -{" "}
                              {product.productGroup?.name || "No Group"}
                            </SelectItem>
                          ))}
                        </Select>
                        {errors[`items.${index}.product`] && (
                          <p className="text-sm text-red-500">
                            {errors[`items.${index}.product`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Cost *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "unitCost",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={
                            errors[`items.${index}.unitCost`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors[`items.${index}.unitCost`] && (
                          <p className="text-sm text-red-500">
                            {errors[`items.${index}.unitCost`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Product Details (Read-only when product selected) */}
                    {item.productId && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-3 bg-gray-50 rounded-md">
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-800">SKU</Label>
                          <p className="text-sm font-mono bg-white p-2 rounded border">
                            {item.sku}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-800">
                            Product Name
                          </Label>
                          <p className="text-sm bg-white p-2 rounded border">
                            {item.name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm text-gray-800">Unit</Label>
                          <p className="text-sm bg-white p-2 rounded border">
                            {item.unit}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity Shipped *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantityShipped}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantityShipped",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={
                            errors[`items.${index}.quantityShipped`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors[`items.${index}.quantityShipped`] && (
                          <p className="text-sm text-red-500">
                            {errors[`items.${index}.quantityShipped`]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity Received *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantityReceived}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantityReceived",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className={
                            errors[`items.${index}.quantityReceived`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors[`items.${index}.quantityReceived`] && (
                          <p className="text-sm text-red-500">
                            {errors[`items.${index}.quantityReceived`]}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder="Enter product description"
                        rows={2}
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label>Item Notes</Label>
                      <Textarea
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(index, "notes", e.target.value)
                        }
                        placeholder="Enter any item-specific notes"
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading
                  ? "Saving..."
                  : isEdit
                  ? "Update Waybill"
                  : "Create Waybill"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
