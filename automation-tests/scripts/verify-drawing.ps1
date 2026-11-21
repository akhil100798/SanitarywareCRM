param([string]$ImagePath)
Add-Type -AssemblyName System.Drawing
$fullPath = (Resolve-Path $ImagePath).Path
$img = [System.Drawing.Image]::FromFile($fullPath)
Write-Host "Loaded successfully: $($img.Width)x$($img.Height)"
$img.Dispose()
