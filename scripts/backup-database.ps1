<#
.SYNOPSIS
    Automated MySQL database backup script for Sanitaryware CRM.
    Generates point-in-time, compressed, cryptographically verified database snapshots.

.DESCRIPTION
    1. Executes mysqldump with --single-transaction, --quick, --routines, --triggers.
    2. Streams output into GZip compressed archive (.sql.gz).
    3. Calculates SHA-256 checksum for cryptographic verification (.sha256).
    4. Automatically purges snapshots older than RetentionDays.

.PARAMETER Mode
    Execution mode: 'docker' (default) or 'cli'
.PARAMETER ContainerName
    Docker container name (defaults to auto-detecting 'mysql')
.PARAMETER Database
    Database name (default: 'sanitaryware_crm_staging')
.PARAMETER User
    Database user (default: 'crm_user')
.PARAMETER Password
    Database password
.PARAMETER BackupDir
    Output directory for backups (default: 'backups/')
.PARAMETER RetentionDays
    Retention period in days (default: 30)
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
    [string]$BackupDir = "",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    $BackupDir = Join-Path $repoRoot "backups"
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$baseFileName = "$($Database)_backup_$timestamp"
$rawSqlPath = Join-Path $BackupDir "$baseFileName.sql"
$gzPath = Join-Path $BackupDir "$baseFileName.sql.gz"
$shaPath = Join-Path $BackupDir "$baseFileName.sql.gz.sha256"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Sanitaryware CRM: Automated Database Backup Runner" -ForegroundColor Cyan
Write-Host "Database: $Database | Mode: $Mode | User: $User" -ForegroundColor Cyan
Write-Host "Target Directory: $BackupDir" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Detect container if in docker mode
if ($Mode -eq "docker" -and [string]::IsNullOrWhiteSpace($ContainerName)) {
    $runningContainers = docker ps --format "{{.Names}}" | Where-Object { $_ -match "mysql" }
    if ($runningContainers) {
        $ContainerName = ($runningContainers | Select-Object -First 1).Trim()
        Write-Host "Auto-detected running MySQL container: $ContainerName" -ForegroundColor Green
    } else {
        $ContainerName = "sanitarywarecrm-mysql-1"
        Write-Host "No active MySQL container detected. Using default '$ContainerName'." -ForegroundColor Yellow
    }
}

$startTime = Get-Date

try {
    Write-Host "Initiating mysqldump snapshot with --single-transaction..." -ForegroundColor Yellow
    if ($Mode -eq "docker") {
        docker exec -i $ContainerName mysqldump --single-transaction --quick --routines --triggers -u $User -p"$Password" $Database | Out-File -FilePath $rawSqlPath -Encoding UTF8
    } else {
        mysqldump -h $DbHost -P $DbPort -u $User -p"$Password" --single-transaction --quick --routines --triggers $Database | Out-File -FilePath $rawSqlPath -Encoding UTF8
    }

    if (-not (Test-Path $rawSqlPath) -or (Get-Item $rawSqlPath).Length -eq 0) {
        throw "mysqldump produced an empty or missing output file."
    }

    $rawSize = (Get-Item $rawSqlPath).Length

    # Compress SQL to GZip
    Write-Host "Compressing backup using GZip..." -ForegroundColor Yellow
    $inStream = [System.IO.File]::OpenRead($rawSqlPath)
    $outStream = [System.IO.File]::Create($gzPath)
    $gzipStream = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionMode]::Compress)
    $inStream.CopyTo($gzipStream)
    $gzipStream.Close()
    $outStream.Close()
    $inStream.Close()

    # Remove uncompressed raw SQL to save disk space
    Remove-Item -Path $rawSqlPath -Force

    $gzSize = (Get-Item $gzPath).Length
    $ratio = [Math]::Round(($rawSize - $gzSize) / $rawSize * 100, 1)

    # Calculate SHA-256 Checksum
    Write-Host "Calculating SHA-256 integrity checksum..." -ForegroundColor Yellow
    $sha256 = (Get-FileHash -Path $gzPath -Algorithm SHA256).Hash.ToLower()
    $checksumLine = "$sha256  $baseFileName.sql.gz"
    Set-Content -Path $shaPath -Value $checksumLine -Encoding ASCII

    $endTime = Get-Date
    $duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 2)

    Write-Host ""
    Write-Host ">>> BACKUP COMPLETED SUCCESSFULLY in ${duration}s <<<" -ForegroundColor Green
    Write-Host "Archive File: $gzPath ($([Math]::Round($gzSize / 1KB, 2)) KB, $ratio% compression)" -ForegroundColor White
    Write-Host "SHA-256 Hash: $sha256" -ForegroundColor Gray
    Write-Host "Checksum File: $shaPath" -ForegroundColor White

    # Prune old backups
    Write-Host ""
    Write-Host "Checking retention policy (older than $RetentionDays days)..." -ForegroundColor Yellow
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem -Path $BackupDir -File | Where-Object { $_.CreationTime -lt $cutoff }
    foreach ($old in $oldBackups) {
        Remove-Item -Path $old.FullName -Force
        Write-Host "Purged expired backup: $($old.Name)" -ForegroundColor DarkGray
    }
} catch {
    Write-Error "Backup failed: $_"
    if (Test-Path $rawSqlPath) { Remove-Item -Path $rawSqlPath -Force -ErrorAction SilentlyContinue }
    exit 1
}
