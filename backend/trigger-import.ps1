# Production Import - PowerShell Script
# Logs in as admin and triggers the Google Sheets import

$BACKEND_URL = "https://clyne-paper-crm-backend.fly.dev"

Write-Host "`n🔐 Logging in as admin...`n" -ForegroundColor Cyan

# Get credentials
$AdminEmail = Read-Host "Enter admin email"
$AdminPasswordSecure = Read-Host "Enter admin password" -AsSecureString
$AdminPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPasswordSecure)
)

Write-Host "`n🔑 Getting auth token..." -ForegroundColor Yellow

# Login
$loginBody = @{
    email = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token

    if (-not $token) {
        Write-Host "❌ Login failed! No token received." -ForegroundColor Red
        Write-Host "Response: $loginResponse" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ Login successful!`n" -ForegroundColor Green

    # Check status
    Write-Host "🔍 Checking import service status...`n" -ForegroundColor Cyan

    $statusResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin-import/status" `
        -Method Get `
        -Headers @{ Authorization = "Bearer $token" }

    Write-Host "Status:" -ForegroundColor Yellow
    $statusResponse | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    # Confirm
    $confirm = Read-Host "⚠️  Proceed with import? (yes/no)"

    if ($confirm -ne "yes") {
        Write-Host "❌ Import cancelled" -ForegroundColor Red
        exit 0
    }

    # Trigger import
    Write-Host "`n🚀 Triggering Google Sheets import...`n" -ForegroundColor Green

    $importResponse = Invoke-RestMethod -Uri "$BACKEND_URL/api/admin-import/google-sheets" `
        -Method Post `
        -Headers @{ 
            Authorization = "Bearer $token"
            "Content-Type" = "application/json"
        }

    Write-Host "Import Response:" -ForegroundColor Yellow
    $importResponse | ConvertTo-Json -Depth 5 | Write-Host
    Write-Host ""

    Write-Host "📊 Monitor progress with:" -ForegroundColor Cyan
    Write-Host "   fly logs -a clyne-paper-crm-backend`n" -ForegroundColor White

    Write-Host "✅ Done!`n" -ForegroundColor Green

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}
