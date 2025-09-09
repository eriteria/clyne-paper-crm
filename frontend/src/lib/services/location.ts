import { Location } from "@/types";
import { apiClient } from "@/lib/api";

export const locationService = {
  async getLocations(): Promise<Location[]> {
    const response = await apiClient.get("/locations");
    return response.data.data || response.data;
  },
};
