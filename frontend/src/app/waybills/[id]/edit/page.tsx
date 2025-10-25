"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WaybillForm from "@/components/admin/waybills/WaybillForm";
import { Waybill } from "@/types/waybill";
import { waybillService } from "@/lib/services/waybill";
import { toast } from "@/lib/toast";

export default function EditWaybillPage() {
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
        toast.error("Failed to load waybill");
        router.push("/waybills");
      } finally {
        setLoading(false);
      }
    };

    if (waybillId) {
      loadWaybill();
    }
  }, [waybillId, router]);

  const handleSubmit = (updatedWaybill: Waybill) => {
    toast.success("Waybill updated successfully");
    router.push(`/waybills/${updatedWaybill.id}`);
  };

  const handleCancel = () => {
    router.push(`/waybills/${waybillId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading waybill...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!waybill) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/waybills/${waybillId}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Waybill
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Waybill {waybill.waybillNumber}
          </h1>
          <p className="text-gray-600">Modify waybill details and items</p>
        </div>
      </div>

      {/* Waybill Form */}
      <WaybillForm
        initialData={waybill}
        isEdit={true}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
