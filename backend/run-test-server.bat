@echo off
REM Script to run backend in test mode for E2E tests
cd /d %~dp0
set NODE_ENV=test
set DATABASE_URL=postgresql://crm:Waiba2001@127.0.0.1:5432/crm_test
npm run dev
