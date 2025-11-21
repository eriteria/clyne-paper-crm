"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckSquare } from "lucide-react";
import WaybillList from "@/components/admin/waybills/WaybillList";
import WaybillForm from "@/components/admin/waybills/WaybillForm";
import WaybillApproval from "@/components/admin/waybills/WaybillApproval";
import { Waybill } from "@/types/waybill";
import { usePageTitle } from "@/hooks/usePageTitle";

type ViewMode = "list" | "create" | "edit" | "approval";

export default function WaybillsPage() {
  usePageTitle("Waybills");
  
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [selectedWaybillId, setSelectedWaybillId] = useState<string>("");
  const searchParams = useSearchParams();

  // Check if we should auto-open create form
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setViewMode("create");
    }
  }, [searchParams]);

  const handleCreateNew = () => {
    setSelectedWaybill(null);
    setViewMode("create");
  };

  const handleEdit = (waybill: Waybill) => {
    setSelectedWaybill(waybill);
    setViewMode("edit");
  };

  const handleApproval = (waybillId: string) => {
    setSelectedWaybillId(waybillId);
    setViewMode("approval");
  };

  const handleBack = () => {
    setViewMode("list");
    setSelectedWaybill(null);
    setSelectedWaybillId("");
  };

  const handleSubmitComplete = () => {
    setViewMode("list");
    setSelectedWaybill(null);
  };

  const handleApprovalComplete = () => {
    setViewMode("list");
    setSelectedWaybillId("");
  };

  const getPageTitle = () => {
    switch (viewMode) {
      case "create":
        return "Log New Waybill";
      case "edit":
        return "Edit Waybill";
      case "approval":
        return "Waybill Approval";
      default:
        return "Waybill Management";
    }
  };

  const getPageIcon = () => {
    switch (viewMode) {
      case "create":
      case "edit":
        return <Plus className="h-6 w-6 text-blue-600" />;
      case "approval":
        return <CheckSquare className="h-6 w-6 text-green-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-700" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getPageIcon()}
          <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
        </div>

        {viewMode === "list" && (
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Log Waybill
          </Button>
        )}

        {viewMode !== "list" && (
          <Button variant="outline" onClick={handleBack}>
            Back to List
          </Button>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-white">
        {viewMode === "list" && (
          <WaybillList onEdit={handleEdit} onApproval={handleApproval} />
        )}

        {viewMode === "create" && (
          <WaybillForm onSubmit={handleSubmitComplete} onCancel={handleBack} />
        )}

        {viewMode === "edit" && selectedWaybill && (
          <WaybillForm
            initialData={selectedWaybill}
            isEdit={true}
            onSubmit={handleSubmitComplete}
            onCancel={handleBack}
          />
        )}

        {viewMode === "approval" && selectedWaybillId && (
          <WaybillApproval
            waybillId={selectedWaybillId}
            onApprovalComplete={handleApprovalComplete}
            onCancel={handleBack}
          />
        )}
      </div>
    </div>
  );
}
