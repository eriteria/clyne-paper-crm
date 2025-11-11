import { PrismaClient } from "@prisma/client";
import { UserFactory } from "./user.factory";
import { CustomerFactory } from "./customer.factory";
import { InvoiceFactory } from "./invoice.factory";
import { WaybillFactory } from "./waybill.factory";

/**
 * Centralized factory manager for creating test data
 */
export class TestDataFactory {
  public users: UserFactory;
  public customers: CustomerFactory;
  public invoices: InvoiceFactory;
  public waybills: WaybillFactory;

  constructor(private prisma: PrismaClient) {
    this.users = new UserFactory(prisma);
    this.customers = new CustomerFactory(prisma);
    this.invoices = new InvoiceFactory(prisma);
    this.waybills = new WaybillFactory(prisma);
  }

  /**
   * Create a complete test scenario with user, customer, and invoice
   */
  async createBasicScenario() {
    const { user } = await this.users.createStaff();
    const customer = await this.customers.create({
      relationshipManagerId: user.id,
    });
    const invoice = await this.invoices.create({
      customerId: customer.id,
      userId: user.id,
    });

    return { user, customer, invoice };
  }

  /**
   * Create a team with users and customers
   */
  async createTeamScenario(teamName: string = "Test Team") {
    // Create team
    const team = await this.prisma.team.create({
      data: {
        name: teamName,
      },
    });

    // Create team members
    const { user: leader } = await this.users.createManager({
      teamId: team.id,
    });

    const { user: member1 } = await this.users.createStaff({
      teamId: team.id,
    });

    const { user: member2 } = await this.users.createStaff({
      teamId: team.id,
    });

    // Update team leader
    await this.prisma.team.update({
      where: { id: team.id },
      data: { leaderUserId: leader.id },
    });

    // Create customers for the team
    const customer1 = await this.customers.create({
      teamId: team.id,
      relationshipManagerId: member1.id,
    });

    const customer2 = await this.customers.create({
      teamId: team.id,
      relationshipManagerId: member2.id,
    });

    return {
      team,
      leader,
      members: [member1, member2],
      customers: [customer1, customer2],
    };
  }

  /**
   * Create inventory scenario with products and stock
   */
  async createInventoryScenario() {
    const location = await this.prisma.location.findFirst();
    if (!location) {
      throw new Error("No location found");
    }

    // Create product group
    const productGroup = await this.prisma.productGroup.create({
      data: {
        name: `Test Product Group ${Date.now()}`,
      },
    });

    // Create products
    const product1 = await this.prisma.product.create({
      data: {
        name: `Test Product 1 ${Date.now()}`,
        productGroupId: productGroup.id,
        monthlyTarget: 10000,
      },
    });

    const product2 = await this.prisma.product.create({
      data: {
        name: `Test Product 2 ${Date.now()}`,
        productGroupId: productGroup.id,
        monthlyTarget: 15000,
      },
    });

    // Create inventory items
    const item1 = await this.prisma.inventoryItem.create({
      data: {
        sku: `SKU-${Date.now()}-1`,
        name: "Test Inventory Item 1",
        description: "Test item description",
        unit: "pcs",
        unitPrice: 100,
        currentQuantity: 1000,
        minStock: 100,
        locationId: location.id,
        productId: product1.id,
      },
    });

    const item2 = await this.prisma.inventoryItem.create({
      data: {
        sku: `SKU-${Date.now()}-2`,
        name: "Test Inventory Item 2",
        description: "Test item description",
        unit: "pcs",
        unitPrice: 150,
        currentQuantity: 500,
        minStock: 50,
        locationId: location.id,
        productId: product2.id,
      },
    });

    return {
      location,
      productGroup,
      products: [product1, product2],
      inventoryItems: [item1, item2],
    };
  }

  /**
   * Create a full invoice lifecycle scenario
   */
  async createInvoiceLifecycleScenario() {
    const { user, customer } = await this.createBasicScenario();

    // Create inventory
    const { inventoryItems } = await this.createInventoryScenario();

    // Create invoice with items
    const invoice = await this.invoices.create({
      customerId: customer.id,
      userId: user.id,
      items: inventoryItems.map((item, index) => ({
        inventoryItemId: item.id,
        quantity: 10 + index * 5,
        unitPrice: parseFloat(item.unitPrice.toString()),
        description: item.name,
      })),
    });

    return {
      user,
      customer,
      invoice,
      inventoryItems,
    };
  }

  /**
   * Clean up all test data
   */
  async cleanup() {
    // This will be called by the test teardown
    // Tables are cleaned in testDb.cleanDatabase()
  }
}

/**
 * Create a factory instance
 */
export function createTestFactory(prisma: PrismaClient): TestDataFactory {
  return new TestDataFactory(prisma);
}
