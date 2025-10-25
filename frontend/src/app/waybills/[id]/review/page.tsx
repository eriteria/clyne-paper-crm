"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import WaybillApproval from "@/components/admin/waybills/WaybillApproval";

export default function WaybillReviewPage() {
  const params = useParams();
  const router = useRouter();
  const waybillId = params.id as string;

  const handleApprovalComplete = () => {
    router.push(`/waybills/${waybillId}`);
  };

  const handleCancel = () => {
    router.push(`/waybills/${waybillId}`);
  };

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
            Review Waybill Products
          </h1>
          <p className="text-gray-600">
            Review and approve new products from this waybill
          </p>
        </div>
      </div>

      {/* Waybill Approval Component */}
      <WaybillApproval
        waybillId={waybillId}
        onApprovalComplete={handleApprovalComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
