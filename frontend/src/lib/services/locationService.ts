// Location service compatible with waybill components
import { locationService as baseLocationService } from "./location";

export const locationService = {
  // Add alias for getAll method to match what waybill components expect
  async getAll() {
    return baseLocationService.getLocations();
  },

  // Re-export existing methods
  getLocations: baseLocationService.getLocations,
};
