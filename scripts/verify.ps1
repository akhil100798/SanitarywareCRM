$ErrorActionPreference = 'Continue'
$repo = Split-Path -Parent $PSScriptRoot
$summaryDir = Join-Path $repo 'reports'
New-Item -ItemType Directory -Force -Path $summaryDir | Out-Null
$results = [System.Collections.Generic.List[object]]::new()
$verificationStartedAt = (Get-Date).ToUniversalTime().ToString('o')

function Save-VerificationSummary([bool]$Completed) {
    $summary = [pscustomobject]@{
        startedAt = $verificationStartedAt
        generatedAt = (Get-Date).ToUniversalTime().ToString('o')
        completed = $Completed
        passed = @($results | Where-Object status -eq 'passed').Count
        failed = @($results | Where-Object status -eq 'failed').Count
        skipped = 0
        testCounts = @{
            passed = [int](($results.tests.passed | Measure-Object -Sum).Sum)
            failed = [int](($results.tests.failed | Measure-Object -Sum).Sum)
            skipped = [int](($results.tests.skipped | Measure-Object -Sum).Sum)
            source = 'Reported runner summaries only; build, audit, environment and UI checks are separate steps'
        }
        steps = @($results.ToArray())
    }
    [IO.File]::WriteAllText((Join-Path $summaryDir 'verification-summary.json'),
        ($summary | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false))
}

function Get-RunnerCounts([string]$Text) {
    $maven = [regex]::Matches($Text, 'Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+)')
    if ($maven.Count) {
        $m = $maven[$maven.Count - 1]
        $failed = [int]$m.Groups[2].Value + [int]$m.Groups[3].Value
        $skipped = [int]$m.Groups[4].Value
        return @{ passed = [int]$m.Groups[1].Value - $failed - $skipped; failed = $failed; skipped = $skipped; source = 'Maven summary' }
    }
    if ($Text -match '(?m)^[^a-zA-Z0-9]*tests (\d+)\s*$') {
        $counts = @{}
        foreach ($key in @('pass', 'fail', 'skipped')) {
            $countMatches = [regex]::Matches($Text, "(?m)^[^a-zA-Z0-9]*$key (\d+)\s*$")
            $counts[$key] = if ($countMatches.Count) { [int]$countMatches[$countMatches.Count - 1].Groups[1].Value } else { 0 }
        }
        return @{ passed = $counts.pass; failed = $counts.fail; skipped = $counts.skipped; source = 'Node test summary' }
    }
    if ($Text -match '\d+ (passed|failed|skipped)\b') {
        $counts = @{}
        foreach ($key in @('passed', 'failed', 'skipped')) {
            $countMatches = [regex]::Matches($Text, "(\d+) $key\b")
            $counts[$key] = if ($countMatches.Count) { [int]$countMatches[$countMatches.Count - 1].Groups[1].Value } else { 0 }
        }
        return @{ passed = $counts.passed; failed = $counts.failed; skipped = $counts.skipped; source = 'Playwright summary' }
    }
    # Non-test commands are checks, not an invented one-test suite.
    return $null
}

function Invoke-VerificationStep([string]$Name, [string]$WorkingDirectory, [string]$Command, [string[]]$Arguments) {
    $started = Get-Date
    $logPath = Join-Path $summaryDir ($Name + '.log')
    Push-Location $WorkingDirectory
    $exitCode = 1
    try {
        & $Command @Arguments *> $logPath
        $exitCode = $LASTEXITCODE
        $output = Get-Content $logPath -ErrorAction SilentlyContinue
    } catch {
        $output = @($_.Exception.Message)
    } finally {
        Pop-Location
    }
    $results.Add([pscustomobject]@{
        name = $Name
        status = if ($exitCode -eq 0) { 'passed' } else { 'failed' }
        exitCode = $exitCode
        durationSeconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 2)
        tests = Get-RunnerCounts ($output -join "`n")
        logPath = $logPath
        outputTail = (($output | Select-Object -Last 20) -join "`n")
    })
    Save-VerificationSummary $false
    Write-Host "$Name completed: exit $exitCode"
    return $exitCode
}

$backend = Join-Path $repo 'backend'
$frontend = Join-Path $repo 'frontend'
$mobile = Join-Path $repo 'mobile'
$automation = Join-Path $repo 'automation-tests'
$env:QA_ADMIN_PASSWORD = if ($env:QA_ADMIN_PASSWORD) { $env:QA_ADMIN_PASSWORD } else { throw 'QA_ADMIN_PASSWORD must be set before verification.' }
$env:QA_MANAGER_PASSWORD = if ($env:QA_MANAGER_PASSWORD) { $env:QA_MANAGER_PASSWORD } else { throw 'QA_MANAGER_PASSWORD must be set before verification.' }
$env:QA_SALES_PASSWORD = if ($env:QA_SALES_PASSWORD) { $env:QA_SALES_PASSWORD } else { throw 'QA_SALES_PASSWORD must be set before verification.' }
$env:QA_WAREHOUSE_PASSWORD = if ($env:QA_WAREHOUSE_PASSWORD) { $env:QA_WAREHOUSE_PASSWORD } else { throw 'QA_WAREHOUSE_PASSWORD must be set before verification.' }

Save-VerificationSummary $false
Invoke-VerificationStep 'backend-tests' $backend 'apache-maven-3.9.6/bin/mvn.cmd' @('test') | Out-Null
Invoke-VerificationStep 'frontend-unit-tests' $frontend 'npm.cmd' @('test') | Out-Null
Invoke-VerificationStep 'frontend-build' $frontend 'npm.cmd' @('run', 'build') | Out-Null
Invoke-VerificationStep 'frontend-legacy-e2e' $frontend 'npm.cmd' @('run', 'test:legacy') | Out-Null
Invoke-VerificationStep 'mobile-tests' $mobile 'npm.cmd' @('test') | Out-Null
Invoke-VerificationStep 'mobile-lint' $mobile 'npm.cmd' @('run', 'lint') | Out-Null
Invoke-VerificationStep 'remediation-regressions' $repo 'node.exe' @('--test', 'scripts/deployment-contracts.test.mjs', 'scripts/cleanup-regression.test.mjs', 'scripts/qa-credentials.test.mjs', 'scripts/owned-responses.test.mjs', 'scripts/audit-env.test.mjs') | Out-Null
Invoke-VerificationStep 'automation-health' $automation 'npm.cmd' @('run', 'health') | Out-Null
Invoke-VerificationStep 'automation-seed' $automation 'npm.cmd' @('run', 'seed') | Out-Null
Invoke-VerificationStep 'automation-api' $automation 'npm.cmd' @('run', 'test:api') | Out-Null
Invoke-VerificationStep 'automation-frontend-e2e' $automation 'npm.cmd' @('run', 'test:frontend') | Out-Null
Invoke-VerificationStep 'automation-mobile-viewport' $automation 'npx.cmd' @('playwright', 'test', '--project=Mobile Chrome (Pixel 5)', '--project=Mobile Safari (iPhone 13)', '--reporter=line') | Out-Null
Invoke-VerificationStep 'automation-database' $automation 'npm.cmd' @('run', 'test:database') | Out-Null
Invoke-VerificationStep 'automation-security' $automation 'npm.cmd' @('run', 'test:security') | Out-Null
Invoke-VerificationStep 'automation-bughunt' $automation 'npm.cmd' @('run', 'test:bughunt') | Out-Null
Invoke-VerificationStep 'automation-cleanup' $automation 'npm.cmd' @('run', 'cleanup') | Out-Null

$env:UI_URL = if ($env:UI_URL) { $env:UI_URL } else { 'http://localhost:8082' }
$env:API_URL = if ($env:API_URL) { $env:API_URL } else { 'http://localhost:8081/api' }
$env:RUN_LEGACY_SMOKE = '1'
Invoke-VerificationStep 'expo-real-ui' $mobile 'npm.cmd' @('run', 'ui:smoke') | Out-Null
Invoke-VerificationStep 'mobile-android-export' $mobile 'npm.cmd' @('run', 'export:android') | Out-Null
$env:CRM_ANDROID_BUILD_ROOT = $null
Invoke-VerificationStep 'mobile-native-staging' $repo 'powershell.exe' @('-NoProfile', '-File', 'scripts/stage-android.ps1') | Out-Null
if ($results[$results.Count - 1].status -eq 'passed') {
    $env:CRM_ANDROID_BUILD_ROOT = (Get-Content (Join-Path $summaryDir 'android-staging.json') -Raw | ConvertFrom-Json).buildRoot
}
$nativeBuildArguments = @('--max-workers=1', '--no-daemon', '-Dorg.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=384m', '-Pkotlin.compiler.execution.strategy=in-process')
Invoke-VerificationStep 'mobile-android-debug' $mobile 'npm.cmd' (@('run', 'build:android:debug', '--') + $nativeBuildArguments) | Out-Null
Invoke-VerificationStep 'mobile-android-release' $mobile 'npm.cmd' (@('run', 'build:android:release', '--') + $nativeBuildArguments) | Out-Null
Invoke-VerificationStep 'mysql-migrations' $backend 'apache-maven-3.9.6/bin/mvn.cmd' @('test-compile', 'failsafe:integration-test', 'failsafe:verify', '-Pmysql-integration') | Out-Null
Invoke-VerificationStep 'frontend-audit' $repo 'node.exe' @('scripts/audit.mjs', 'frontend') | Out-Null
Invoke-VerificationStep 'mobile-audit' $repo 'node.exe' @('scripts/audit.mjs', 'mobile') | Out-Null
Invoke-VerificationStep 'automation-audit' $repo 'node.exe' @('scripts/audit.mjs', 'automation-tests') | Out-Null
Invoke-VerificationStep 'git-diff-check' $repo 'git.exe' @('diff', '--check') | Out-Null

$passed = @($results | Where-Object status -eq 'passed').Count
$failed = @($results | Where-Object status -eq 'failed').Count
Save-VerificationSummary $true
$results | Format-Table name, status, exitCode, durationSeconds
if ($failed -gt 0) { exit 1 }
