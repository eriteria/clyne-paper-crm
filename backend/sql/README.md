Production role update
======================

This folder contains a safe SQL script `update_roles_prod.sql` which updates the
`permissions` column for the `Admin` and `Super Admin` roles only. It does NOT
create or delete any users or roles.

Important: Always take a backup before running SQL on production. Recommended steps:

1. Create a database snapshot or logical backup (pg_dump).
2. Run the script on a staging database first to validate results.

Running with psql (PowerShell example):

1) Set environment variables for the DB connection (example):

   $env:PGHOST = "your-db-host"
   $env:PGPORT = "5432"
   $env:PGUSER = "postgres"
   $env:PGPASSWORD = "yourpassword"
   $env:PGDATABASE = "clyne_paper_crm"

2) Backup current Admin and Super Admin rows to CSV:

   psql -c "\copy (SELECT id,name,permissions,created_at,updated_at FROM roles WHERE name IN ('Admin','Super Admin')) TO 'roles_backup.csv' CSV HEADER"

3) Run the update script:

   psql -f .\update_roles_prod.sql

Running with Prisma (Node) — use the project's safe TypeScript script:

1) Ensure `DATABASE_URL` points to the production DB in your shell environment.
2) From the `backend/` folder run:

   npm run update-roles:prod

This will execute `update-production-roles.ts`, which is designed to only update
existing roles and skip missing roles.

Notes:
- The SQL in `update_roles_prod.sql` sets the `permissions` column to a JSON-style
  string. If your database stores this as JSONB, you may prefer to use JSONB
  functions instead.
- If `Super Admin` role is not present, the second UPDATE will affect 0 rows and
  do nothing.
- If you'd like, I can also generate a small single-file Node script that
  connects to your production DB and performs the update. Tell me which method
  you prefer and I will add it.

Node script (no dependencies on Prisma):

1) Set `DATABASE_URL` to point to your production DB.
2) From this `sql/` folder run (PowerShell):

   $env:DATABASE_URL = "postgresql://user:password@host:5432/clyne_paper_crm"
   node .\update_roles_prod.js

This will execute the SQL inside `update_roles_prod.sql` inside a transaction
and roll back on error.
