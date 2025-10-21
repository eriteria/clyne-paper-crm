#!/usr/bin/env node
// Simple Node script to run the role update SQL against a database URL provided
// via the DATABASE_URL environment variable. This uses the 'pg' package.

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL environment variable and try again.');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.join(__dirname, 'update_roles_prod.sql'), 'utf8');

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to DB. Beginning transaction...');
    await client.query('BEGIN');
    const res = await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Role update executed.');
  } catch (err) {
    console.error('❌ Error running SQL:', err.message || err);
    try { await client.query('ROLLBACK'); } catch(e){}
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
