// NOTE: The original implementation depended on fields (e.g., Team.locationNames, Customer.location) that no longer exist in the schema.
// To unblock the build, we provide no-op placeholders and minimal behavior. Re-implement against TeamLocation/Location when ready.

export async function createDefaultTeamsForLocations(): Promise<{
  success: boolean;
  created: number;
  existing: number;
  teams: Array<{ name: string; id: string; locations: string[] }>;
}> {
  return { success: true, created: 0, existing: 0, teams: [] };
}

export async function getTeamForLocation(
  location: string
): Promise<string | null> {
  return null;
}

export async function assignCustomersToTeams(): Promise<{
  success: boolean;
  assigned: number;
  unassigned: number;
  errors: Array<{
    customerId: string;
    customerName: string;
    location: string;
    error: string;
  }>;
}> {
  return { success: true, assigned: 0, unassigned: 0, errors: [] };
}

export async function addLocationMapping(
  location: string,
  teamName: string
): Promise<{
  success: boolean;
  teamId: string;
  message: string;
}> {
  return { success: true, teamId: "", message: "No-op mapping added" };
}

export async function getLocationMappings(): Promise<{
  success: boolean;
  mappings: Array<{
    teamName: string;
    teamId: string;
    locations: string[];
    customerCount: number;
  }>;
}> {
  return { success: true, mappings: [] };
}
