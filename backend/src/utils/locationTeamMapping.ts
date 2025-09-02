import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Location to Team mapping service
 * This service handles mapping customer locations to teams during import
 */

interface LocationMapping {
  location: string;
  teamName: string;
  teamId?: string;
}

/**
 * Default location mappings - can be customized based on business needs
 */
const DEFAULT_LOCATION_MAPPINGS: LocationMapping[] = [
  { location: "Lagos", teamName: "Lagos Sales Team" },
  { location: "Abuja", teamName: "Abuja Sales Team" },
  { location: "Port Harcourt", teamName: "Port Harcourt Sales Team" },
  { location: "Kano", teamName: "Kano Sales Team" },
  { location: "Ibadan", teamName: "Ibadan Sales Team" },
];

/**
 * Create default teams if they don't exist
 */
export async function createDefaultTeamsForLocations(): Promise<{
  success: boolean;
  created: number;
  existing: number;
  teams: Array<{ name: string; id: string; locations: string[] }>;
}> {
  console.log("🏗️  Creating default teams for locations...");

  let created = 0;
  let existing = 0;
  const teams: Array<{ name: string; id: string; locations: string[] }> = [];

  // Get the default region (or create one)
  let defaultRegion = await prisma.region.findFirst({
    where: { name: "Nigeria" },
  });

  if (!defaultRegion) {
    defaultRegion = await prisma.region.create({
      data: {
        name: "Nigeria",
      },
    });
    console.log("✅ Created default region: Nigeria");
  }

  for (const mapping of DEFAULT_LOCATION_MAPPINGS) {
    const existingTeam = await prisma.team.findFirst({
      where: { name: mapping.teamName },
    });

    if (existingTeam) {
      // Update existing team to include the location name
      const updatedTeam = await prisma.team.update({
        where: { id: existingTeam.id },
        data: {
          locationNames: {
            set: [
              ...(existingTeam.locationNames || []),
              mapping.location,
            ].filter((location, index, arr) => arr.indexOf(location) === index), // Remove duplicates
          },
        },
      });

      teams.push({
        name: updatedTeam.name,
        id: updatedTeam.id,
        locations: updatedTeam.locationNames,
      });
      existing++;
      console.log(
        `✅ Updated existing team: ${mapping.teamName} with location: ${mapping.location}`
      );
    } else {
      // Create new team
      const newTeam = await prisma.team.create({
        data: {
          name: mapping.teamName,
          regionId: defaultRegion.id,
          locationNames: [mapping.location],
        },
      });

      teams.push({
        name: newTeam.name,
        id: newTeam.id,
        locations: newTeam.locationNames,
      });
      created++;
      console.log(
        `✅ Created new team: ${mapping.teamName} for location: ${mapping.location}`
      );
    }
  }

  console.log(
    `🎉 Team setup completed! Created: ${created}, Updated: ${existing}`
  );

  return {
    success: true,
    created,
    existing,
    teams,
  };
}

/**
 * Get team ID for a given location
 */
export async function getTeamForLocation(
  location: string
): Promise<string | null> {
  if (!location?.trim()) return null;

  const normalizedLocation = location.trim().toLowerCase();

  // First, try to find team with exact location match
  const team = await prisma.team.findFirst({
    where: {
      locationNames: {
        hasSome: [location], // Case-sensitive match first
      },
    },
  });

  if (team) {
    return team.id;
  }

  // Try case-insensitive match
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      locationNames: true,
    },
  });

  for (const team of teams) {
    const hasLocation = team.locationNames.some(
      (loc) => loc.toLowerCase() === normalizedLocation
    );
    if (hasLocation) {
      return team.id;
    }
  }

  // If no exact match, try partial match
  for (const team of teams) {
    const hasPartialMatch = team.locationNames.some(
      (loc) =>
        loc.toLowerCase().includes(normalizedLocation) ||
        normalizedLocation.includes(loc.toLowerCase())
    );
    if (hasPartialMatch) {
      console.log(
        `⚠️  Using partial match for location "${location}" -> team with locations: ${team.locationNames.join(", ")}`
      );
      return team.id;
    }
  }

  console.log(`⚠️  No team found for location: ${location}`);
  return null;
}

/**
 * Assign customers to teams based on their location
 */
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
  console.log("🔗 Assigning customers to teams based on their locations...");

  const customers = await prisma.customer.findMany({
    where: {
      teamId: null, // Only assign customers not already assigned to teams
      location: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      location: true,
    },
  });

  let assigned = 0;
  let unassigned = 0;
  const errors: Array<{
    customerId: string;
    customerName: string;
    location: string;
    error: string;
  }> = [];

  for (const customer of customers) {
    try {
      if (!customer.location) {
        unassigned++;
        continue;
      }

      const teamId = await getTeamForLocation(customer.location);

      if (teamId) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { teamId },
        });
        assigned++;
        console.log(
          `✅ Assigned ${customer.name} (${customer.location}) to team`
        );
      } else {
        unassigned++;
        errors.push({
          customerId: customer.id,
          customerName: customer.name,
          location: customer.location,
          error: "No matching team found for location",
        });
      }
    } catch (error) {
      unassigned++;
      errors.push({
        customerId: customer.id,
        customerName: customer.name,
        location: customer.location || "N/A",
        error: `Assignment failed: ${error}`,
      });
    }
  }

  console.log(
    `🎉 Customer assignment completed! Assigned: ${assigned}, Unassigned: ${unassigned}`
  );

  return {
    success: true,
    assigned,
    unassigned,
    errors,
  };
}

/**
 * Add a new location mapping
 */
export async function addLocationMapping(
  location: string,
  teamName: string
): Promise<{
  success: boolean;
  teamId: string;
  message: string;
}> {
  try {
    const team = await prisma.team.findFirst({
      where: { name: teamName },
    });

    if (!team) {
      throw new Error(`Team "${teamName}" not found`);
    }

    // Add location to team's locationNames if not already present
    const currentLocations = team.locationNames || [];
    if (!currentLocations.includes(location)) {
      await prisma.team.update({
        where: { id: team.id },
        data: {
          locationNames: {
            set: [...currentLocations, location],
          },
        },
      });
    }

    return {
      success: true,
      teamId: team.id,
      message: `Location "${location}" mapped to team "${teamName}"`,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get all location mappings
 */
export async function getLocationMappings(): Promise<{
  success: boolean;
  mappings: Array<{
    teamName: string;
    teamId: string;
    locations: string[];
    customerCount: number;
  }>;
}> {
  const teams = await prisma.team.findMany({
    include: {
      _count: {
        select: {
          customers: true,
        },
      },
    },
    where: {
      locationNames: {
        isEmpty: false,
      },
    },
  });

  const mappings = teams.map((team) => ({
    teamName: team.name,
    teamId: team.id,
    locations: team.locationNames,
    customerCount: team._count.customers,
  }));

  return {
    success: true,
    mappings,
  };
}
