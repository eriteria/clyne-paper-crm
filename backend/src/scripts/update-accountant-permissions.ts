import { PrismaClient } from "@prisma/client";
import { DEFAULT_ROLES, stringifyPermissions } from "../utils/permissions";

const prisma = new PrismaClient();

async function updateAccountantPermissions() {
  console.log("🔄 Updating Accountant role permissions...");

  try {
    const accountantRole = await prisma.role.findUnique({
      where: { name: "Accountant" },
    });

    if (!accountantRole) {
      console.log("❌ Accountant role not found.");
      return;
    }

    const updatedRole = await prisma.role.update({
      where: { id: accountantRole.id },
      data: {
        permissions: stringifyPermissions(DEFAULT_ROLES.ACCOUNTANT.permissions),
      },
    });

    console.log("✅ Accountant role permissions updated successfully!");
    console.log("\n📋 New permissions:");
    const permissions = JSON.parse(updatedRole.permissions);
    console.log(`- Total: ${permissions.length} permissions`);
    console.log(`- Includes: inventory:view, inventory:create, inventory:edit, inventory:adjust`);
    console.log(`- Includes: waybills:view, waybills:create, waybills:edit`);
    console.log(`- Includes: products:view`);
  } catch (error) {
    console.error("❌ Error updating Accountant role:", error);
    throw error;
  }
}

updateAccountantPermissions()
  .then(async () => {
    await prisma.$disconnect();
    console.log("\n✅ Done! Accountants will now see Inventory and Waybills links in the sidebar.");
    console.log("🔄 Users with Accountant role may need to log out and log back in for changes to take effect.");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
