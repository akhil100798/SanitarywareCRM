$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$source = (Resolve-Path -LiteralPath (Join-Path $repo 'mobile')).ProviderPath
$destination = Join-Path ([IO.Path]::GetTempPath()) ('crm-native-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $destination | Out-Null
if (!(Resolve-Path -LiteralPath $destination).ProviderPath.StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Native staging destination escaped the temporary directory'
}
# Copy current uncommitted source and installed dependencies, never .env or stale generated native output.
$exclude = @((Join-Path $source '.gradle'), (Join-Path $source '.expo'), (Join-Path $source 'dist-check-current'),
    (Join-Path $source 'android/.gradle'), (Join-Path $source 'android/build'),
    (Join-Path $source 'android/app/build'), (Join-Path $source 'android/app/.cxx'))
$packages = Get-ChildItem -LiteralPath (Join-Path $source 'node_modules') -Directory -Force
foreach ($entry in $packages) {
    $modules = if ($entry.Name.StartsWith('@')) { Get-ChildItem -LiteralPath $entry.FullName -Directory } else { @($entry) }
    foreach ($module in $modules) {
        foreach ($generated in @('android/build', 'android/.cxx', 'android/.gradle')) {
            $generatedPath = Join-Path $module.FullName $generated
            if (Test-Path -LiteralPath $generatedPath) { $exclude += $generatedPath }
        }
    }
}
& robocopy.exe $source $destination /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS /XD $exclude /XF '.env*' 'ui-smoke-*.png'
if ($LASTEXITCODE -ge 8) { throw "Native source staging failed: robocopy exit $LASTEXITCODE" }
# Windows/cloud attributes are not source code. Clear ReadOnly only on this newly created disposable copy.
Get-ChildItem -LiteralPath $destination -Recurse -Force | ForEach-Object {
    if ($_.Attributes -band [IO.FileAttributes]::ReadOnly) {
        [IO.File]::SetAttributes($_.FullName, ($_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)))
    }
}
$reportDirectory = Join-Path $repo 'reports'
New-Item -ItemType Directory -Force -Path $reportDirectory | Out-Null
@{ source = $source; buildRoot = $destination; generatedAt = (Get-Date).ToUniversalTime().ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reportDirectory 'android-staging.json') -Encoding UTF8
Write-Output "Disposable native build root: $destination"
exit 0
