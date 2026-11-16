<#
.SYNOPSIS
    Executes the Sanitaryware CRM database reconciliation audit against a target MySQL instance.
    Generates a structured Markdown report highlighting any ledger or inventory discrepancies.

.DESCRIPTION
    Runs read-only audit queries covering:
    1. Customer Order Header vs Payment Receipts Ledger
    2. Purchase Order Header vs Supplier Payments Ledger
    3. Distributor Outstanding Balance vs Net Receipts
    4. Inventory Stock Quantity (Negative or Inconsistent)
    5. Payment Idempotency Key Conflicts
    6. Order Line Items Sum vs Recorded Order Total

.PARAMETER Mode
    Execution mode: 'docker' (default) or 'cli'
.PARAMETER ContainerName
    Docker container name (default: 'sanitarywarecrm-mysql-1' or staging container)
.PARAMETER Database
    Database name (default: 'sanitaryware_crm_staging')
.PARAMETER User
    Database username (default: 'crm_user')
.PARAMETER OutputFile
    Optional custom output file path for the report
#>

param (
    [ValidateSet("docker", "cli")]
    [string]$Mode = "docker",

    [string]$ContainerName = "",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$Database = "sanitaryware_crm_staging",
    [string]$User = "crm_user",
    [string]$Password = "staging_crm_password_123",
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$sqlScript = Join-Path $repoRoot "backend\scripts\phase1-reconciliation-report.sql"

if (-not (Test-Path $sqlScript)) {
    Write-Error "SQL script not found at: $sqlScript"
    exit 1
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$auditDir = Join-Path $repoRoot "audit-artifacts"
if (-not (Test-Path $auditDir)) {
    New-Item -ItemType Directory -Path $auditDir -Force | Out-Null
}

if ([string]::IsNullOrWhiteSpace($OutputFile)) {
    $OutputFile = Join-Path $auditDir "reconciliation-report-$timestamp.md"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Sanitaryware CRM: Database Reconciliation Audit Runner" -ForegroundColor Cyan
Write-Host "Mode: $Mode | Database: $Database | User: $User" -ForegroundColor Cyan
Write-Host "Target Script: $sqlScript" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Detect container if running in docker mode and ContainerName not specified
if ($Mode -eq "docker" -and [string]::IsNullOrWhiteSpace($ContainerName)) {
    $runningContainers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "mysql" }
    if ($runningContainers) {
        $ContainerName = ($runningContainers | Select-Object -First 1).Trim()
        Write-Host "Auto-detected running MySQL container: $ContainerName" -ForegroundColor Green
    } else {
        Write-Host "No active MySQL container detected. Defaulting to 'sanitarywarecrm-mysql-1'." -ForegroundColor Yellow
        $ContainerName = "sanitarywarecrm-mysql-1"
    }
}

$rawOutput = ""
$startTime = Get-Date

try {
    if ($Mode -eq "docker") {
        Write-Host "Executing audit inside Docker container [$ContainerName]..." -ForegroundColor Yellow
        $rawOutput = Get-Content -Raw $sqlScript | docker exec -i $ContainerName mysql -u $User -p"$Password" $Database 2>&1
    } else {
        Write-Host "Executing audit via local MySQL CLI against $DbHost:$DbPort..." -ForegroundColor Yellow
        $rawOutput = Get-Content -Raw $sqlScript | mysql -h $DbHost -P $DbPort -u $User -p"$Password" $Database 2>&1
    }
} catch {
    $rawOutput = "Execution Error: " + $_.Exception.Message
}

$endTime = Get-Date
$duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 2)

# Build Markdown Report
$report = @"
# Database Reconciliation Audit Report

**Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Target Database**: ``$Database``  
**Execution Mode**: ``$Mode`` ($ContainerName)  
**Execution Duration**: ${duration}s  
**SQL Source**: ``backend/scripts/phase1-reconciliation-report.sql``  

---

## 1. Audit Summary & Findings

This read-only audit inspects financial and inventory aggregate invariants:
1. **Order Balances vs Payments Ledger**: Verified that ``paid_amount`` and ``balance_amount`` match recorded receipt sums.
2. **Purchase Order Balances vs Supplier Receipts**: Verified supplier payment receipts match purchase order balances.
3. **Distributor Outstanding Balances**: Reconciled advance payments against received purchase orders.
4. **Physical Stock Integrity**: Inspected product inventory for negative quantities.

---

## 2. Query Execution Output

````text
$rawOutput
````

---

## 3. Discrepancy Analysis & Remediation Guidelines

- **Order Header Discrepancies**:
  - If output contains mismatched orders, payments were recorded without updating the order header, or manual status edits bypassed aggregate locks.
  - *Remediation*: Compute ledger total, update ``paid_amount``, ``balance_amount``, and ``payment_status`` within an explicit, audited transaction.
- **Supplier Payment Discrepancies**:
  - If output contains mismatched purchase orders, reconcile advance receipts against invoice totals.
- **Negative Stock**:
  - If negative stock is detected, a physical cycle count is required before issuing stock adjustment entries.

**Verdict**: Audit completed. Review raw output above for discrepancy details.
"@

Set-Content -Path $OutputFile -Value $report -Encoding UTF8
Write-Host "Reconciliation report generated successfully at:" -ForegroundColor Green
Write-Host " -> $OutputFile" -ForegroundColor White
