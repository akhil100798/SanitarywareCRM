$ErrorActionPreference = "Stop"
$stagingDir = Join-Path $env:TEMP "crm-frontend-clean"
if (Test-Path $stagingDir) {
    Remove-Item -Path $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null

robocopy frontend $stagingDir /E /XD node_modules dist .git
# robocopy returns exit codes 0-7 on success
if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed with exit code $LASTEXITCODE"
}

Write-Host "Building Docker image sanitarywarecrm-frontend:latest from $stagingDir..."
docker build -t sanitarywarecrm-frontend:latest $stagingDir

Write-Host "Cleaning up staging directory..."
Remove-Item -Path $stagingDir -Recurse -Force
Write-Host "Frontend Docker image built successfully."
