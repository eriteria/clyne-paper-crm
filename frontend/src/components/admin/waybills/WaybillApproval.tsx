"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertCircle, Package, Info, Save } from "lucide-react";
import { waybillService } from "@/lib/services/waybillService";
import { Waybill, WaybillItem, ApproveProductsRequest } from "@/types/waybill";
import { toast } from "@/lib/toast";

interface WaybillApprovalProps {
  waybillId: string;
  onApprovalComplete?: (waybill: Waybill) => void;
  onCancel?: () => void;
}

interface ProductApprovalData {
  waybillItemId: string;
  productData: {
    name: string;
    description: string;
    unit: string;
    minStock: number;
  };
}

export default function WaybillApproval({
  waybillId,
  onApprovalComplete,
  onCancel,
}: WaybillApprovalProps) {
  const [loading, setLoading] = useState(false);
  const [waybill, setWaybill] = useState<Waybill | null>(null);
  const [approvalData, setApprovalData] = useState<ProductApprovalData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadWaybillData = async () => {
      setLoading(true);
      try {
        const response = await waybillService.getById(waybillId);
        setWaybill(response);

        // Initialize approval data for new products
        const newProductItems = response.items.filter(
          (item: WaybillItem) => item.status === "NEW_PRODUCT"
        );
        setApprovalData(
          newProductItems.map((item: WaybillItem) => ({
            waybillItemId: item.id,
            productData: {
              name: item.name,
              description: item.description || "",
              unit: item.unit,
              minStock: 10,
            },
          }))
        );
      } catch (error) {
        console.error("Error loading waybill:", error);
        toast.error("Failed to load waybill");
      } finally {
        setLoading(false);
      }
    };

    loadWaybillData();
  }, [waybillId]);

  const loadWaybill = async () => {
    setLoading(true);
    try {
      const response = await waybillService.getById(waybillId);
      setWaybill(response);

      // Initialize approval data for new products
      const newProductItems = response.items.filter(
        (item: WaybillItem) => item.status === "NEW_PRODUCT"
      );
      setApprovalData(
        newProductItems.map((item: WaybillItem) => ({
          waybillItemId: item.id,
          productData: {
            name: item.name,
            description: item.description || "",
            unit: item.unit,
            minStock: 10,
          },
        }))
      );
    } catch (error) {
      console.error("Error loading waybill:", error);
      toast.error("Failed to load waybill");
    } finally {
      setLoading(false);
    }
  };

  const updateApprovalData = (
    itemId: string,
    field: keyof ProductApprovalData["productData"],
    value: string | number
  ) => {
    setApprovalData((prev) =>
      prev.map((approval) =>
        approval.waybillItemId === itemId
          ? {
              ...approval,
              productData: { ...approval.productData, [field]: value },
            }
          : approval
      )
    );
  };

  const handleApprove = async () => {
    if (!waybill) return;

    setSubmitting(true);
    try {
      const request: ApproveProductsRequest = {
        approvedItems: approvalData,
      };

      await waybillService.approveProducts(waybillId, request);
      toast.success("Products approved successfully");

      // Reload waybill to get updated status
      await loadWaybill();
      onApprovalComplete?.(waybill);
    } catch (error) {
      console.error("Error approving products:", error);
      toast.error("Failed to approve products");
    } finally {
      setSubmitting(false);
    }
  };

  const getItemStatusBadge = (status: string) => {
    switch (status) {
      case "MATCHED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Matched
          </Badge>
        );
      case "PROCESSED":
        return (
          <Badge variant="default" className="bg-blue-100 text-blue-800">
            Processed
          </Badge>
        );
      case "NEW_PRODUCT":
        return <Badge variant="destructive">Needs Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWaybillStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        );
      case "PROCESSING":
        return <Badge variant="secondary">Processing</Badge>;
      case "REVIEW":
        return <Badge variant="destructive">Needs Review</Badge>;
      case "PENDING":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading waybill...</p>
        </div>
      </div>
    );
  }

  if (!waybill) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Waybill not found</p>
        </div>
      </div>
    );
  }

  const newProductItems = waybill.items.filter(
    (item) => item.status === "NEW_PRODUCT"
  );
  const processedItems = waybill.items.filter(
    (item) => item.status !== "NEW_PRODUCT"
  );

  return (
    <div className="space-y-6">
      {/* Waybill Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Waybill Review - {waybill.waybillNumber}
            </CardTitle>
            {getWaybillStatusBadge(waybill.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Supplier
              </Label>
              <p className="font-medium">{waybill.supplier}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Location
              </Label>
              <p className="font-medium">{waybill.location.name}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Date</Label>
              <p className="font-medium">
                {new Date(waybill.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Received By
              </Label>
              <p className="font-medium">{waybill.receivedBy.fullName}</p>
            </div>
          </div>
          {waybill.notes && (
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700">Notes</Label>
              <p className="text-sm text-gray-800">{waybill.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Items Summary */}
      {processedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Processed Items ({processedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{item.name}</span>
                      {getItemStatusBadge(item.status)}
                    </div>
                    <div className="text-sm text-gray-700 mt-1">
                      SKU: {item.sku} • {item.quantityReceived} {item.unit} • ₦
                      {Number(item.unitCost).toFixed(2)} each
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Products Needing Approval */}
      {newProductItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              New Products Requiring Approval ({newProductItems.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <Info className="h-4 w-4" />
              These products are new to the system and require review before
              adding to inventory
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {newProductItems.map((item, index) => {
                const approval = approvalData.find(
                  (a) => a.waybillItemId === item.id
                );
                if (!approval) return null;

                return (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Product {index + 1}</h4>
                      {getItemStatusBadge(item.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Original SKU
                        </Label>
                        <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                          {item.sku}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Quantity & Cost
                        </Label>
                        <p className="font-medium">
                          {item.quantityReceived} {item.unit} @ ₦
                          {Number(item.unitCost).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">
                        Product Information for Inventory
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${item.id}`}>
                            Product Name *
                          </Label>
                          <Input
                            id={`name-${item.id}`}
                            value={approval.productData.name}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              updateApprovalData(
                                item.id,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="Enter product name for inventory"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`unit-${item.id}`}>
                            Unit of Measure *
                          </Label>
                          <Input
                            id={`unit-${item.id}`}
                            value={approval.productData.unit}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              updateApprovalData(
                                item.id,
                                "unit",
                                e.target.value
                              )
                            }
                            placeholder="e.g., pieces, kg, liters"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`minStock-${item.id}`}>
                            Minimum Stock Level
                          </Label>
                          <Input
                            id={`minStock-${item.id}`}
                            type="number"
                            min="0"
                            value={approval.productData.minStock}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) =>
                              updateApprovalData(
                                item.id,
                                "minStock",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="Minimum stock threshold"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`description-${item.id}`}>
                          Description
                        </Label>
                        <Textarea
                          id={`description-${item.id}`}
                          value={approval.productData.description}
                          onChange={(
                            e: React.ChangeEvent<HTMLTextAreaElement>
                          ) =>
                            updateApprovalData(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Enter product description"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {newProductItems.length > 0 && (
        <div className="flex items-center justify-end gap-4 pt-6 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleApprove}
            disabled={
              submitting || approvalData.some((a) => !a.productData.name.trim())
            }
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {submitting
              ? "Approving..."
              : `Approve ${newProductItems.length} Product${
                  newProductItems.length > 1 ? "s" : ""
                }`}
          </Button>
        </div>
      )}

      {newProductItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Items Processed
            </h3>
            <p className="text-gray-600">
              This waybill has been fully processed and all items have been
              added to inventory.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
