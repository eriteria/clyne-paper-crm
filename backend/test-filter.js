const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDateFilter() {
  try {
    // Test the exact same filter that the sales report is using
    const startDate = new Date('2000-01-01');  // Same as frontend
    const endDate = new Date('2025-09-23');    // Same as frontend
    
    console.log('=== TESTING DATE FILTER ===');
    console.log(`StartDate: ${startDate}`);
    console.log(`EndDate: ${endDate}`);
    console.log(`StartDate UTC: ${startDate.toISOString()}`);
    console.log(`EndDate UTC: ${endDate.toISOString()}`);
    
    // Get a sample invoice to compare
    const sampleInvoice = await prisma.invoice.findFirst({
      select: { id: true, createdAt: true, date: true }
    });
    
    if (sampleInvoice) {
      console.log(`\nSample invoice createdAt: ${sampleInvoice.createdAt}`);
      console.log(`Sample invoice createdAt UTC: ${sampleInvoice.createdAt.toISOString()}`);
      console.log(`Is createdAt >= startDate? ${sampleInvoice.createdAt >= startDate}`);
      console.log(`Is createdAt <= endDate? ${sampleInvoice.createdAt <= endDate}`);
    }
    
    // Test the exact query from sales report
    const where = {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };
    
    console.log(`\nWhere clause: ${JSON.stringify(where, null, 2)}`);
    
    const matchingInvoices = await prisma.invoice.findMany({
      where,
      select: { id: true, createdAt: true }
    });
    
    console.log(`\nMatching invoices: ${matchingInvoices.length}`);
    
    // Try without lte filter
    const withoutEndDate = await prisma.invoice.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: { id: true, createdAt: true }
    });
    
    console.log(`Invoices with only gte filter: ${withoutEndDate.length}`);
    
    // Try without any date filter
    const allInvoices = await prisma.invoice.findMany({
      select: { id: true, createdAt: true }
    });
    
    console.log(`All invoices: ${allInvoices.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDateFilter();