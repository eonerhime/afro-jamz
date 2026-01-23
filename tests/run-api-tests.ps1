# AfroJamz API Test Automation Script
# This script automates testing all routes (except file upload/download)

$baseUrl = "http://localhost:3001"
$tokens = @{}

Write-Host "`n🧪 AfroJamz API Test Suite" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Test counter
$passed = 0
$failed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{},
        [int]$ExpectedStatus = 200
    )

    Write-Host "Testing: $Name..." -NoNewline

    try {
        $params = @{
            Uri = "$baseUrl$Url"
            Method = $Method
            Headers = $Headers
        }

        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }

        $response = Invoke-RestMethod @params -ErrorAction Stop
        
        if ($response) {
            Write-Host " ✅ PASSED" -ForegroundColor Green
            $script:passed++
            return $response
        }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host " ✅ PASSED ($statusCode)" -ForegroundColor Green
            $script:passed++
        }
        else {
            Write-Host " ❌ FAILED (Expected $ExpectedStatus, got $statusCode)" -ForegroundColor Red
            Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
            $script:failed++
        }
        return $null
    }
}

# ============================================
# PHASE 1: AUTHENTICATION
# ============================================
Write-Host "`n📋 PHASE 1: Authentication" -ForegroundColor Yellow

$producerData = @{
    username = "producer1"
    email = "producer@test.com"
    password = "Producer123!"
    role = "producer"
}
$response = Test-Endpoint -Name "Register Producer" -Method POST -Url "/auth/register" -Body $producerData -ExpectedStatus 201
if ($response) { $tokens.producer = $response.token }

$buyerData = @{
    username = "buyer1"
    email = "buyer@test.com"
    password = "Buyer123!"
    role = "buyer"
}
$response = Test-Endpoint -Name "Register Buyer" -Method POST -Url "/auth/register" -Body $buyerData -ExpectedStatus 201
if ($response) { $tokens.buyer = $response.token }

$adminData = @{
    username = "admin"
    email = "admin@test.com"
    password = "Admin123!"
    role = "buyer"
}
Test-Endpoint -Name "Register Admin" -Method POST -Url "/auth/register" -Body $adminData -ExpectedStatus 201

Write-Host "`n⚠️  Manual Step Required: Upgrade admin user" -ForegroundColor Magenta
Write-Host "   Run: sqlite3 src/backend/db/sqlite.db" -ForegroundColor Gray
Write-Host "   UPDATE users SET role = 'admin' WHERE email = 'admin@test.com';" -ForegroundColor Gray
Read-Host "`n   Press Enter after upgrading admin user"

$loginProducer = @{ email = "producer@test.com"; password = "Producer123!" }
$response = Test-Endpoint -Name "Login Producer" -Method POST -Url "/auth/login" -Body $loginProducer
if ($response) { $tokens.producer = $response.token }

$loginBuyer = @{ email = "buyer@test.com"; password = "Buyer123!" }
$response = Test-Endpoint -Name "Login Buyer" -Method POST -Url "/auth/login" -Body $loginBuyer
if ($response) { $tokens.buyer = $response.token }

$loginAdmin = @{ email = "admin@test.com"; password = "Admin123!" }
$response = Test-Endpoint -Name "Login Admin" -Method POST -Url "/auth/login" -Body $loginAdmin
if ($response) { $tokens.admin = $response.token }

# ============================================
# PHASE 2: BEATS (PUBLIC)
# ============================================
Write-Host "`n📋 PHASE 2: Beats (Public Routes)" -ForegroundColor Yellow

Test-Endpoint -Name "Get All Beats" -Method GET -Url "/api/beats"
Test-Endpoint -Name "Get Beats by Genre" -Method GET -Url "/api/beats?genre=Afrobeat"
Test-Endpoint -Name "Get Standard Licenses" -Method GET -Url "/api/licenses"

# ============================================
# PHASE 3: PRODUCER FEATURES
# ============================================
Write-Host "`n📋 PHASE 3: Producer Features" -ForegroundColor Yellow

$authHeader = @{ Authorization = "Bearer $($tokens.producer)" }

Write-Host "Testing: Upload Beat..." -NoNewline
Write-Host " ⚠️  SKIPPED (Requires file upload)" -ForegroundColor Yellow
Write-Host "   Use Thunder Client or cURL for file upload test" -ForegroundColor Gray

Test-Endpoint -Name "Get My Beats" -Method GET -Url "/api/producer/beats/my-beats" -Headers $authHeader

Write-Host "`n⚠️  Note: Create license test requires beat_id from upload" -ForegroundColor Magenta
Write-Host "   Skipping create license test" -ForegroundColor Gray

# ============================================
# PHASE 4: BUYER FEATURES
# ============================================
Write-Host "`n📋 PHASE 4: Buyer Features" -ForegroundColor Yellow

$authHeader = @{ Authorization = "Bearer $($tokens.buyer)" }

$paymentMethod = @{
    provider = "card"
    card_number = "4111111111111111"
    expiry_month = 12
    expiry_year = 2026
    cvv = "123"
    cardholder_name = "Test Buyer"
}
Test-Endpoint -Name "Add Payment Method" -Method POST -Url "/api/buyer/payment-methods" -Body $paymentMethod -Headers $authHeader -ExpectedStatus 201

Test-Endpoint -Name "Get My Payment Methods" -Method GET -Url "/api/buyer/payment-methods" -Headers $authHeader

Test-Endpoint -Name "Set Default Payment" -Method PUT -Url "/api/buyer/payment-methods/1/default" -Headers $authHeader

Write-Host "`n⚠️  Note: Purchase test requires beat and license from upload" -ForegroundColor Magenta
Write-Host "   Skipping purchase-dependent tests" -ForegroundColor Gray

# ============================================
# PHASE 5: ADMIN FEATURES
# ============================================
Write-Host "`n📋 PHASE 5: Admin Features" -ForegroundColor Yellow

$authHeader = @{ Authorization = "Bearer $($tokens.admin)" }

Test-Endpoint -Name "Get All Users" -Method GET -Url "/api/admin/users" -Headers $authHeader
Test-Endpoint -Name "Get All Purchases" -Method GET -Url "/api/admin/purchases" -Headers $authHeader
Test-Endpoint -Name "Get Platform Analytics" -Method GET -Url "/api/admin/analytics" -Headers $authHeader
Test-Endpoint -Name "Get Pending Disputes" -Method GET -Url "/api/admin/disputes" -Headers $authHeader

# ============================================
# SUMMARY
# ============================================
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 Test Results" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor Red
Write-Host "⚠️  Skipped: 4 (File upload/download tests)" -ForegroundColor Yellow
Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Upload beat via Thunder Client or cURL" -ForegroundColor Gray
Write-Host "   2. Create license for uploaded beat" -ForegroundColor Gray
Write-Host "   3. Test purchase flow" -ForegroundColor Gray
Write-Host "   4. Test download via PowerShell script" -ForegroundColor Gray
Write-Host "`nSee tests/TESTING_GUIDE.md for manual test steps.`n" -ForegroundColor Gray
