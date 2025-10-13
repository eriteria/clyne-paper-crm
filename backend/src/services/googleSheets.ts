import { google } from "googleapis";
import path from "path";
import fs from "fs";

/**
 * Google Sheets Service
 * Handles authentication and reading data from Google Sheets
 */

// Sheet IDs for Clyne Paper sheets
export const SHEET_IDS = {
  DATABASE: "1NLzldesyGsAXR-UfWnX6ax37sZ42MbD0b7PiIMi9hf4",
  MASTER: "1wURUIeMCe1AERYzI6Q7DIofuBJQwq__-GMKNjGW3IpE",
};

// Sheet names/tabs within each workbook
export const SHEET_NAMES = {
  // Database workbook tabs
  CUSTOMERS: "CUSTOMERS", // Customer list with relationship managers
  PRODUCTS: "PRODUCTS", // Product list
  PRODUCT_GROUPS: "PRODUCT GROUPS AND TARGETS", // Product groups with targets
  SALES_TEAM: "SALES TEAM", // Sales team list
  STOCK: "Stock", // Stock/inventory

  // Master workbook tabs
  INVOICE_LIST: "INVOICE LIST", // Main invoice list
  PAYMENTS: "PAYMENTS", // Payment records
  INVOICE_FORM_1: "INVOICE FORM 1",
  INVOICE_FORM_2: "INVOICE FORM 2",
  CUSTOMER_STATEMENTS: "CUSTOMER STATEMENT",
  CUSTOMER_ACCOUNTS: "CUSTOMER ACCOUNTS",
  INVOICE_EXPORT: "INVOICE EXPORT",
  SALES_TEAM_REPORT: "SALES TEAM REPORT",
  SALES_REPORT: "SALES REPORT",
  DEBTORS_SHEET: "DEBTORS SHEET",
};

/**
 * Initialize Google Sheets API with service account credentials
 */
export async function getGoogleSheetsClient() {
  try {
    let credentials;

    // First, try to read from environment variable (production)
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      const credentialsJson = Buffer.from(
        process.env.GOOGLE_CREDENTIALS_BASE64,
        "base64"
      ).toString("utf8");
      credentials = JSON.parse(credentialsJson);
      console.log("✅ Using Google credentials from environment variable");
    } else {
      // Fall back to local file (development)
      const credentialsPath = path.join(
        __dirname,
        "../../google-credentials.json"
      );

      // Check if credentials file exists
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(
          `Google credentials not found!\n` +
            `Either:\n` +
            `1. Set GOOGLE_CREDENTIALS_BASE64 environment variable (production)\n` +
            `2. Place google-credentials.json file at: ${credentialsPath} (development)`
        );
      }

      credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
      console.log("✅ Using Google credentials from local file");
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    return sheets;
  } catch (error) {
    console.error("Error initializing Google Sheets client:", error);
    throw error;
  }
}

/**
 * Read data from a specific sheet range
 */
export async function readSheetData(
  spreadsheetId: string,
  sheetName: string,
  range: string = "A:Z" // Default to reading all columns
): Promise<any[][]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const fullRange = `${sheetName}!${range}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
    });

    return response.data.values || [];
  } catch (error: any) {
    console.error(`Error reading sheet data from ${sheetName}:`, error.message);
    throw error;
  }
}

/**
 * Parse sheet data into objects with headers as keys
 */
export function parseSheetData<T = any>(rows: any[][]): T[] {
  if (rows.length === 0) return [];

  const headers = rows[0];
  const data: T[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};

    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });

    data.push(obj);
  }

  return data;
}

/**
 * Parse Nigerian Naira currency string to number
 * Handles formats like: ₦25,500.00, N25500, 25,500.00
 */
export function parseNairaCurrency(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = value
    .toString()
    .replace(/[₦N,\s]/g, "")
    .trim();

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse various date formats from Google Sheets
 */
export function parseSheetDate(dateValue: string): Date | null {
  if (!dateValue) return null;

  try {
    // Try parsing common formats
    // Format 1: "5 Jun 2025"
    const format1 = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/;
    const match1 = dateValue.match(format1);
    if (match1) {
      const day = match1[1];
      const month = match1[2];
      const year = match1[3];
      return new Date(`${month} ${day}, ${year}`);
    }

    // Format 2: "28 Aug 2024"
    // Format 3: Standard date string
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    console.warn(`Unable to parse date: ${dateValue}`);
    return null;
  } catch (error) {
    console.error(`Error parsing date "${dateValue}":`, error);
    return null;
  }
}

/**
 * Get all sheet names in a spreadsheet
 */
export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    return (
      response.data.sheets?.map((sheet) => sheet.properties?.title || "") || []
    );
  } catch (error: any) {
    console.error("Error getting sheet names:", error.message);
    throw error;
  }
}

/**
 * Read and parse customers from Database sheet
 */
export async function readCustomersFromSheet() {
  const rows = await readSheetData(SHEET_IDS.DATABASE, SHEET_NAMES.CUSTOMERS);
  return parseSheetData(rows);
}

/**
 * Read and parse invoices from Master sheet
 */
export async function readInvoicesFromSheet() {
  const rows = await readSheetData(SHEET_IDS.MASTER, SHEET_NAMES.INVOICE_LIST);
  return parseSheetData(rows);
}

/**
 * Read and parse payments from Master sheet
 */
export async function readPaymentsFromSheet() {
  const rows = await readSheetData(SHEET_IDS.MASTER, SHEET_NAMES.PAYMENTS);
  return parseSheetData(rows);
}
