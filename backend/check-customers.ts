import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.customer.count();
  console.log("Total customers in database:", count);

  const recent = await prisma.customer.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true },
  });

  console.log("\nMost recent customers:");
  recent.forEach((c) =>
    console.log(`  - ${c.name} (${c.createdAt.toISOString()})`)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
