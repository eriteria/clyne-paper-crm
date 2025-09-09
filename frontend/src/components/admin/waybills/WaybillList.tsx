"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Eye, Play, CheckCircle } from "lucide-react";
import { Waybill, WaybillStatus } from "@/types/waybill";
import { waybillService } from "@/lib/services/waybill";
import { locationService } from "@/lib/services/location";
import { Location } from "@/types";
import { useRouter } from "next/navigation";

interface WaybillListProps {
  onEdit?: (waybill: Waybill) => void;
  onApproval?: (waybillId: string) => void;
}

export default function WaybillList({ onEdit, onApproval }: WaybillListProps) {
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    locationId: "",
    supplier: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  const {} = {};
  const router = useRouter();

  // Fetch locations for filter dropdown
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationData = await locationService.getLocations();
        setLocations(locationData);
      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };
    fetchLocations();
  }, []);

  const fetchWaybills = useCallback(async () => {
    try {
      setLoading(true);
      const response = await waybillService.getWaybills({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setWaybills(response.waybills);
      setPagination(response.pagination);
    } catch (err) {
      console.error("Error fetching waybills:", err);
      alert("Failed to fetch waybills");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  const handleProcessWaybill = async (waybillId: string) => {
    try {
      const result = await waybillService.processWaybill(waybillId);

      alert(
        `Processing Complete - Matched: ${result.results.matched}, Processed: ${result.results.processed}, New Products: ${result.results.newProducts}`
      );

      // Refresh the list
      fetchWaybills();
    } catch (err) {
      console.error("Error processing waybill:", err);
      alert("Failed to process waybill");
    }
  };

  useEffect(() => {
    fetchWaybills();
  }, [fetchWaybills]);

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

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-700" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Supplier</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Search supplier..."
                  className="pl-10"
                  value={filters.supplier}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFilters({ ...filters, supplier: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Status</label>
              <Select
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REVIEW">Review</SelectItem>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-gray-700">Location</label>
              <Select
                value={filters.locationId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, locationId: e.target.value })
                }
              >
                <SelectItem value="">All locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({ status: "", locationId: "", supplier: "" })
                }
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waybills Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waybill #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading waybills...
                    </TableCell>
                  </TableRow>
                ) : waybills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No waybills found
                    </TableCell>
                  </TableRow>
                ) : (
                  waybills.map((waybill) => (
                    <TableRow key={waybill.id}>
                      <TableCell className="font-medium">
                        {waybill.waybillNumber}
                      </TableCell>
                      <TableCell>{waybill.supplier}</TableCell>
                      <TableCell>
                        {new Date(waybill.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{waybill.location.name}</TableCell>
                      <TableCell>{getStatusBadge(waybill.status)}</TableCell>
                      <TableCell>{waybill.items.length}</TableCell>
                      <TableCell>{waybill.receivedBy.fullName}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/admin/waybills/${waybill.id}`)
                            }
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {/* Edit button - for pending waybills */}
                          {waybill.status === WaybillStatus.PENDING &&
                            onEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(waybill)}
                                className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                              >
                                Edit
                              </Button>
                            )}

                          {waybill.status === WaybillStatus.PENDING && (
                            <Button
                              size="sm"
                              onClick={() => handleProcessWaybill(waybill.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Process
                            </Button>
                          )}

                          {waybill.status === WaybillStatus.REVIEW && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onApproval
                                  ? onApproval(waybill.id)
                                  : router.push(
                                      `/admin/waybills/${waybill.id}/review`
                                    )
                              }
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            disabled={pagination.page === 1}
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page - 1 })
            }
          >
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {[...Array(pagination.pages)].map((_, i) => (
              <Button
                key={i + 1}
                variant={pagination.page === i + 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setPagination({ ...pagination, page: i + 1 })}
              >
                {i + 1}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            disabled={pagination.page === pagination.pages}
            onClick={() =>
              setPagination({ ...pagination, page: pagination.page + 1 })
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
