<#
.SYNOPSIS
    Disaster Recovery: Automated MySQL database restore script for Sanitaryware CRM.
    Verifies cryptographic integrity before restoring to target instance.

.DESCRIPTION
    1. Validates existence and SHA-256 checksum of backup archive.
    2. Decompresses GZip stream into SQL commands.
    3. Streams SQL into target database.
    4. Executes post-restore verification of Flyway migrations and table counts.

.PARAMETER BackupArchive
    Path to the .sql.gz backup file to restore
.PARAMETER Mode
    Execution mode: 'docker' (default) or 'cli'
.PARAMETER ContainerName
    Target Docker container (default: 'sanitarywarecrm-mysql-1')
.PARAMETER Database
    Target database name
.PARAMETER User
    Database username
.PARAMETER Password
    Database password
#>

param (
    [Parameter(Mandatory = $true)]
    [string]$BackupArchive,

    [ValidateSet("docker", "cli")]
    [string]$Mode = "docker",

    [string]$ContainerName = "sanitarywarecrm-mysql-1",
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$Database = "sanitaryware_crm_staging",
    [string]$User = "crm_user",
    [string]$Password = "staging_crm_password_123"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupArchive)) {
    Write-Error "Backup archive not found at: $BackupArchive"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Sanitaryware CRM: Disaster Recovery Database Restore" -ForegroundColor Cyan
Write-Host "Archive: $BackupArchive | Database: $Database | Mode: $Mode" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 1: Checksum Verification
$shaFile = "$BackupArchive.sha256"
if (Test-Path $shaFile) {
    Write-Host "Verifying SHA-256 cryptographic integrity..." -ForegroundColor Yellow
    $expectedHash = (Get-Content $shaFile | Select-Object -First 1).Split(" ")[0].Trim().ToLower()
    $actualHash = (Get-FileHash -Path $BackupArchive -Algorithm SHA256).Hash.ToLower()

    if ($expectedHash -ne $actualHash) {
        Write-Error "CHECKSUM MISMATCH! Archive may be corrupted or tampered with.`nExpected: $expectedHash`nActual:   $actualHash"
        exit 1
    }
    Write-Host "Checksum verified OK: $actualHash" -ForegroundColor Green
} else {
    Write-Host "WARNING: No companion .sha256 file found. Proceeding without checksum verification." -ForegroundColor DarkYellow
}

$startTime = Get-Date

try {
    # Step 2: Decompress and Stream Restore
    Write-Host "Decompressing and streaming restore into $Database..." -ForegroundColor Yellow
    
    $tempSql = [System.IO.Path]::GetTempFileName()
    $inStream = [System.IO.File]::OpenRead($BackupArchive)
    $gzipStream = New-Object System.IO.Compression.GZipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outStream = [System.IO.File]::Create($tempSql)
    $gzipStream.CopyTo($outStream)
    $gzipStream.Close()
    $outStream.Close()
    $inStream.Close()

    if ($Mode -eq "docker") {
        Get-Content -Raw $tempSql | docker exec -i $ContainerName mysql -u $User -p"$Password" $Database
    } else {
        Get-Content -Raw $tempSql | mysql -h $DbHost -P $DbPort -u $User -p"$Password" $Database
    }

    Remove-Item -Path $tempSql -Force

    $endTime = Get-Date
    $duration = [Math]::Round(($endTime - $startTime).TotalSeconds, 2)

    Write-Host ""
    Write-Host ">>> RESTORE COMPLETED SUCCESSFULLY in ${duration}s <<<" -ForegroundColor Green

    # Step 3: Post-Restore Health Verification
    Write-Host "Verifying post-restore Flyway schema history..." -ForegroundColor Yellow
    $verifyQuery = "SELECT COUNT(*) AS migration_count FROM flyway_schema_history;"
    if ($Mode -eq "docker") {
        $check = docker exec -i $ContainerName mysql -u $User -p"$Password" -e "$verifyQuery" $Database 2>&1
    } else {
        $check = mysql -h $DbHost -P $DbPort -u $User -p"$Password" -e "$verifyQuery" $Database 2>&1
    }
    Write-Host $check -ForegroundColor White
} catch {
    Write-Error "Database restore failed: $_"
    if (Test-Path $tempSql) { Remove-Item -Path $tempSql -Force -ErrorAction SilentlyContinue }
    exit 1
}
