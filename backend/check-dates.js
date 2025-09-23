const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  try {
    const invoices = await prisma.invoice.findMany({
      select: { 
        id: true, 
        date: true, 
        createdAt: true,
        invoiceNumber: true 
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('=== INVOICE DATE COMPARISON ===');
    invoices.forEach(invoice => {
      console.log(`ID: ${invoice.id}`);
      console.log(`  Invoice #: ${invoice.invoiceNumber}`);
      console.log(`  Date (business): ${invoice.date}`);
      console.log(`  CreatedAt (system): ${invoice.createdAt}`);
      console.log(`  Year difference: ${invoice.date.getFullYear()} vs ${invoice.createdAt.getFullYear()}`);
      console.log('---');
    });
    
    // Check if any invoices match our date filter
    const matchingInvoices = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: new Date('2000-01-01'),
          lte: new Date('2025-09-23')
        }
      },
      select: { id: true, createdAt: true },
      take: 3
    });
    
    console.log(`Matching invoices with createdAt filter: ${matchingInvoices.length}`);
    matchingInvoices.forEach(inv => {
      console.log(`  ID: ${inv.id}, CreatedAt: ${inv.createdAt}`);
    });
    
    // Also check raw count
    const totalCount = await prisma.invoice.count();
    console.log(`Total invoices in DB: ${totalCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();