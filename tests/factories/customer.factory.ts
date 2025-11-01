import { PrismaClient } from "@prisma/client";
import { generateTestId } from "../utils/testDb";

export interface CreateCustomerOptions {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  locationId?: string;
  teamId?: string;
  city?: string;
  state?: string;
  country?: string;
  taxId?: string;
  creditLimit?: number;
  relationshipManagerId?: string;
}

/**
 * Factory for creating test customers
 */
export class CustomerFactory {
  constructor(private prisma: PrismaClient) {}

  async create(options: CreateCustomerOptions = {}) {
    const {
      name = `Test Customer ${generateTestId()}`,
      email = `customer-${generateTestId()}@test.com`,
      phone = "+2348012345678",
      address = "123 Test Street",
      locationId,
      teamId,
      city = "Lagos",
      state = "Lagos State",
      country = "Nigeria",
      taxId,
      creditLimit = 100000,
      relationshipManagerId,
    } = options;

    // Ensure location exists
    let finalLocationId = locationId;
    if (!finalLocationId) {
      const location = await this.prisma.location.findFirst();
      if (!location) {
        throw new Error("No location found. Create a location first.");
      }
      finalLocationId = location.id;
    }

    const customer = await this.prisma.customer.create({
      data: {
        name,
        email,
        phone,
        address,
        locationId: finalLocationId,
        teamId,
        city,
        state,
        country,
        taxId,
        creditLimit,
        relationshipManagerId,
      },
      include: {
        location: true,
        team: true,
        relationshipManager: true,
      },
    });

    return customer;
  }

  async createMany(count: number, options: CreateCustomerOptions = {}) {
    const customers = [];
    for (let i = 0; i < count; i++) {
      customers.push(
        await this.create({
          ...options,
          name: `Test Customer ${i + 1}`,
          email: `customer-${i}-${generateTestId()}@test.com`,
        })
      );
    }
    return customers;
  }

  async createWithTeam(teamId: string, options: Partial<CreateCustomerOptions> = {}) {
    return this.create({
      ...options,
      teamId,
    });
  }
}
