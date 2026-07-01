# Sanitaryware CRM Automation Test Orchestration

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting Sanitaryware CRM Test Automation" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "Running Health Check..." -ForegroundColor Yellow
node scripts/health-check.js
if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend health check failed. Aborting tests."
    exit 1
}

# 2. Seed Test Data
Write-Host "Seeding Mock Test Data..." -ForegroundColor Yellow
node scripts/seed-test-data.js
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Database seeding encountered issues. Attempting to proceed..."
}

# 3. Execute Suites
Write-Host "Executing Playwright Automation Suites..." -ForegroundColor Yellow
npx playwright test
$TestExitCode = $LASTEXITCODE

# 4. Cleanup Test Data
Write-Host "Cleaning Up Mock Test Data..." -ForegroundColor Yellow
node scripts/cleanup-test-data.js

Write-Host "=========================================" -ForegroundColor Cyan
if ($TestExitCode -eq 0) {
    Write-Host "All Automation Suites Passed Successfully!" -ForegroundColor Green
} else {
    Write-Host "Some Test Suites Failed. Check reports folder." -ForegroundColor Red
}
Write-Host "=========================================" -ForegroundColor Cyan

exit $TestExitCode
