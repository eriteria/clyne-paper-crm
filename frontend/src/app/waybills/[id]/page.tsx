"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Package,
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  FileText,
  Edit,
  Play,
  CheckCircle,
} from "lucide-react";
import { Waybill, WaybillStatus } from "@/types/waybill";
import { waybillService } from "@/lib/services/waybill";
import { toast } from "@/lib/toast";

export default function WaybillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [waybill, setWaybill] = useState<Waybill | null>(null);
  const [loading, setLoading] = useState(true);

  const waybillId = params.id as string;

  useEffect(() => {
    const loadWaybill = async () => {
      try {
        setLoading(true);
        const response = await waybillService.getById(waybillId);
        setWaybill(response);
      } catch (error) {
        console.error("Error loading waybill:", error);
        toast.error("Failed to load waybill details");
      } finally {
        setLoading(false);
      }
    };

    if (waybillId) {
      loadWaybill();
    }
  }, [waybillId]);

  const handleProcessWaybill = async () => {
    if (!waybill) return;

    try {
      const result = await waybillService.processWaybill(waybill.id);
      toast.success(
        `Processing Complete - Matched: ${result.results.matched}, Processed: ${result.results.processed}, New Products: ${result.results.newProducts}`
      );

      // Reload waybill to get updated status
      const updatedWaybill = await waybillService.getById(waybillId);
      setWaybill(updatedWaybill);
    } catch (error) {
      console.error("Error processing waybill:", error);
      toast.error("Failed to process waybill");
    }
  };

  const getStatusBadge = (status: WaybillStatus) => {
    const variants = {
      [WaybillStatus.PENDING]: "secondary",
      [WaybillStatus.PROCESSING]: "default",
      [WaybillStatus.COMPLETED]: "default",
      [WaybillStatus.REVIEW]: "destructive",
    } as const;

    const colors = {
      [WaybillStatus.PENDING]: "bg-yellow-100 text-yellow-800",
      [WaybillStatus.PROCESSING]: "bg-blue-100 text-blue-800",
      [WaybillStatus.COMPLETED]: "bg-green-100 text-green-800",
      [WaybillStatus.REVIEW]: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge variant={variants[status]} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading waybill details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!waybill) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Waybill Not Found
            </h3>
            <p className="text-gray-800 mb-4">
              The waybill you&apos;re looking for doesn&apos;t exist or has been
              removed.
            </p>
            <Button onClick={() => router.push("/admin/waybills")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Waybills
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/waybills")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Waybills
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Waybill {waybill.waybillNumber}
            </h1>
            <p className="text-gray-600">
              View waybill details and manage items
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {getStatusBadge(waybill.status)}

          {/* Action Buttons */}
          {waybill.status === WaybillStatus.PENDING && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/admin/waybills/${waybill.id}/edit`)
                }
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button onClick={handleProcessWaybill}>
                <Play className="w-4 h-4 mr-2" />
                Process
              </Button>
            </>
          )}

          {waybill.status === WaybillStatus.REVIEW && (
            <Button
              onClick={() =>
                router.push(`/admin/waybills/${waybill.id}/review`)
              }
              className="bg-orange-600 hover:bg-orange-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Review Products
            </Button>
          )}
        </div>
      </div>

      {/* Waybill Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Waybill Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Waybill Number
              </Label>
              <p className="font-semibold text-lg">{waybill.waybillNumber}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Supplier
              </Label>
              <p className="font-medium">{waybill.supplier}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <p className="font-medium">
                {new Date(waybill.date).toLocaleDateString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location
              </Label>
              <p className="font-medium">
                {waybill.location?.name || "No location"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <User className="h-4 w-4" />
                Received By
              </Label>
              <p className="font-medium">{waybill.receivedBy.fullName}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <div>{getStatusBadge(waybill.status)}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Total Items
              </Label>
              <p className="font-medium">{waybill.items.length}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Created
              </Label>
              <p className="font-medium">
                {new Date(waybill.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {waybill.notes && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  Notes
                </Label>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md">
                  {waybill.notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Waybill Items */}
      <Card>
        <CardHeader>
          <CardTitle>Waybill Items ({waybill.items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {waybill.items.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{item.name}</h4>
                    <p className="text-gray-600 text-sm">SKU: {item.sku}</p>
                    {item.description && (
                      <p className="text-gray-600 text-sm mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      item.status === "PROCESSED"
                        ? "default"
                        : item.status === "NEW_PRODUCT"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {item.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-700">Unit</Label>
                    <p className="font-medium">{item.unit}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Quantity Received</Label>
                    <p className="font-medium">
                      {Number(item.quantityReceived)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Unit Cost</Label>
                    <p className="font-medium">
                      ₦{Number(item.unitCost).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-700">Total Value</Label>
                    <p className="font-medium">
                      ₦
                      {(
                        Number(item.quantityReceived) * Number(item.unitCost)
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>

                {item.batchNo && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-700">Batch Number</Label>
                        <p className="font-medium">{item.batchNo}</p>
                      </div>
                      {item.expiryDate && (
                        <div>
                          <Label className="text-gray-700">Expiry Date</Label>
                          <p className="font-medium">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
