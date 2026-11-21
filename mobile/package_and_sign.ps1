$apkOrig = "mobile/android/app/build/outputs/apk/release/app-release.apk"
$apkNew = "mobile/android/app/build/outputs/apk/release/app-updated.apk"
Copy-Item $apkOrig $apkNew -Force

$hbcFile = (Get-ChildItem "mobile/dist/_expo/static/js/android/*.hbc" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
if (-not $hbcFile) {
    $hbcFile = (Get-ChildItem "mobile/dist-check-current/_expo/static/js/android/*.hbc" | Select-Object -First 1).FullName
}
Write-Host "Using HBC: $hbcFile"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($apkNew, [System.IO.Compression.ZipArchiveMode]::Update)

$entriesToRemove = @()
foreach ($entry in $zip.Entries) {
    if ($entry.FullName -eq "assets/index.android.bundle" -or $entry.FullName -like "META-INF/*") {
        $entriesToRemove += $entry
    }
}
foreach ($e in $entriesToRemove) {
    $e.Delete()
}

$newEntry = $zip.CreateEntry("assets/index.android.bundle", [System.IO.Compression.CompressionLevel]::Optimal)
$stream = $newEntry.Open()
$bytes = [System.IO.File]::ReadAllBytes($hbcFile)
$stream.Write($bytes, 0, $bytes.Length)
$stream.Dispose()
$zip.Dispose()
Write-Host "ZIP updated successfully"

$apksigner = "C:\Users\akhil\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
$keystore = "mobile/android/app/debug.keystore"
& $apksigner sign --ks $keystore --ks-pass pass:android --ks-key-alias androiddebugkey --key-pass pass:android $apkNew
Write-Host "APK signed successfully"
