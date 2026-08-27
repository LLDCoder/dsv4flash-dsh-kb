[CmdletBinding()]
param(
    [string]$AssetDirectory = $PSScriptRoot,
    [string]$ManifestPath,
    [string]$ZstdPath = "zstd",
    [switch]$KeepIntermediate
)

$ErrorActionPreference = "Stop"
$assetRoot = [IO.Path]::GetFullPath($AssetDirectory)
if (-not $ManifestPath) {
    $manifests = @(Get-ChildItem -LiteralPath $assetRoot -Filter "*.manifest.json")
    if ($manifests.Count -ne 1) {
        throw "Expected exactly one *.manifest.json in $assetRoot."
    }
    $ManifestPath = $manifests[0].FullName
}

$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$archivePath = Join-Path $assetRoot $manifest.archive.name
$tarPath = $archivePath -replace '\.zst$', ''
$buffer = New-Object byte[] (8MB)

Write-Host "Verifying $($manifest.parts.Count) release parts"
foreach ($part in $manifest.parts) {
    $partPath = Join-Path $assetRoot $part.name
    $file = Get-Item -LiteralPath $partPath
    if ($file.Length -ne [int64]$part.sizeBytes) {
        throw "Size mismatch for $($part.name)"
    }
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $partPath).Hash.ToLowerInvariant()
    if ($hash -ne $part.sha256) {
        throw "SHA-256 mismatch for $($part.name)"
    }
}

Write-Host "Joining parts into $archivePath"
$target = [IO.File]::Create($archivePath)
try {
    foreach ($part in $manifest.parts) {
        $partPath = Join-Path $assetRoot $part.name
        $source = [IO.File]::OpenRead($partPath)
        try {
            while (($read = $source.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $target.Write($buffer, 0, $read)
            }
        }
        finally {
            $source.Dispose()
        }
    }
}
finally {
    $target.Dispose()
}

$archive = Get-Item -LiteralPath $archivePath
if ($archive.Length -ne [int64]$manifest.archive.sizeBytes) {
    throw "Joined archive size does not match the manifest."
}
$archiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
if ($archiveHash -ne $manifest.archive.sha256) {
    throw "Joined archive SHA-256 does not match the manifest."
}

Write-Host "Decompressing $archivePath"
& $ZstdPath -T0 -d -f $archivePath -o $tarPath
if ($LASTEXITCODE -ne 0) {
    throw "zstd decompression failed."
}

Write-Host "Loading Docker images"
& docker image load --input $tarPath
if ($LASTEXITCODE -ne 0) {
    throw "docker image load failed."
}

foreach ($image in $manifest.images) {
    & docker image inspect $image.name *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Loaded bundle is missing image: $($image.name)"
    }
}

if (-not $KeepIntermediate) {
    Remove-Item -LiteralPath $tarPath -Force
    Remove-Item -LiteralPath $archivePath -Force
}

Write-Host "All $($manifest.images.Count) Docker images loaded successfully."
