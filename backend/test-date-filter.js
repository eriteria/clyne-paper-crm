const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDateFilter() {
  console.log('=== Testing Invoice Date Filtering ===');
  
  try {
    // First, get all invoices to see what we have
    const allInvoices = await prisma.invoice.findMany({
      select: { 
        id: true, 
        date: true, 
        createdAt: true,
        invoiceNumber: true 
      },
      take: 5
    });
    
    console.log('\n1. All invoices (sample):');
    console.log(JSON.stringify(allInvoices, null, 2));
    
    // Test the exact filter that sales report uses
    const salesReportFilter = {
      createdAt: {
        gte: new Date("2000-01-01")
      }
    };
    
    console.log('\n2. Sales report filter (createdAt >= 2000-01-01):');
    console.log('Filter:', JSON.stringify(salesReportFilter, null, 2));
    
    const salesReportResult = await prisma.invoice.findMany({
      where: salesReportFilter,
      select: { 
        id: true, 
        date: true, 
        createdAt: true,
        invoiceNumber: true 
      },
      take: 5
    });
    
    console.log('Result count:', salesReportResult.length);
    console.log('Sample results:', JSON.stringify(salesReportResult, null, 2));
    
    // Test with just count
    const count = await prisma.invoice.count({
      where: salesReportFilter
    });
    
    console.log('\n3. Count with same filter:', count);
    
    // Test without any filter
    const noFilterCount = await prisma.invoice.count();
    console.log('4. Total invoice count (no filter):', noFilterCount);
    
    // Test the working invoices endpoint filter
    const invoicesFilter = {
      createdAt: {
        gte: new Date(0) // This is what the invoices endpoint uses for "all time"
      }
    };
    
    console.log('\n5. Invoices endpoint filter (createdAt >= new Date(0)):');
    const invoicesResult = await prisma.invoice.count({
      where: invoicesFilter
    });
    console.log('Count with invoices filter:', invoicesResult);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDateFilter();