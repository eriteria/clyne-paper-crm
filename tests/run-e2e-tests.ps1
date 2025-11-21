# Run E2E tests with test database
# This script sets up the environment and runs Playwright tests

Write-Host "🧪 Starting E2E Tests with Test Database" -ForegroundColor Cyan
Write-Host ""

# Start backend with test environment in background
Write-Host "📦 Starting backend with test database..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\backend'; `$env:NODE_ENV='test'; `$env:DATABASE_URL='postgresql://crm:Waiba2001@127.0.0.1:5432/crm_test'; npm run dev" -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start frontend in background
Write-Host "🌐 Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..\frontend'; npm run dev" -WindowStyle Normal

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Run tests
Write-Host ""
Write-Host "🎭 Running Playwright Tests..." -ForegroundColor Green
Write-Host ""

cd "$PSScriptRoot"
npx playwright test --project=chromium --reporter=line

Write-Host ""
Write-Host "✅ Tests completed!" -ForegroundColor Green
Write-Host "💡 Remember to stop the backend and frontend servers manually" -ForegroundColor Yellow
