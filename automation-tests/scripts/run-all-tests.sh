#!/bin/bash

echo "========================================="
echo "Starting Sanitaryware CRM Test Automation"
echo "========================================="

# 1. Health Check
echo "Running Health Check..."
node scripts/health-check.js
if [ $? -ne 0 ]; then
    echo "Backend health check failed. Aborting tests."
    exit 1
fi

# 2. Seed Test Data
echo "Seeding Mock Test Data..."
node scripts/seed-test-data.js
if [ $? -ne 0 ]; then
    echo "Database seeding encountered issues. Proceeding..."
fi

# 3. Execute Suites
echo "Executing Playwright Automation Suites..."
npx playwright test
TEST_EXIT_CODE=$?

# 4. Cleanup Test Data
echo "Cleaning Up Mock Test Data..."
node scripts/cleanup-test-data.js

echo "========================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "All Automation Suites Passed Successfully!"
else
    echo "Some Test Suites Failed. Check reports folder."
fi
echo "========================================="

exit $TEST_EXIT_CODE
