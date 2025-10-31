import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedBankAccounts() {
  console.log("🏦 Seeding bank accounts...");

  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: "default-bank-account" },
    update: {},
    create: {
      id: "default-bank-account",
      accountName: "CLYNE PAPER LIMITED",
      accountNumber: "2045723876",
      bankName: "FIRST BANK",
      isActive: true,
    },
  });

  console.log(
    `✅ Bank account created: ${bankAccount.accountName} - ${bankAccount.bankName}`
  );

  return { bankAccount };
}

async function main() {
  await seedBankAccounts();
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
