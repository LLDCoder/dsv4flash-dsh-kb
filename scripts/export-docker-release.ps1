[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\dist\docker-release"),
    [string]$BundleName = "dsh-docker-images-linux-amd64",
    [ValidateRange(100, 2000)]
    [int]$PartSizeMiB = 1900,
    [string]$ZstdPath = "zstd",
    [switch]$KeepIntermediate
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($outputRoot) | Out-Null

Push-Location $repoRoot
try {
    $images = @(& docker compose config --images | Sort-Object -Unique)
    if ($LASTEXITCODE -ne 0 -or $images.Count -eq 0) {
        throw "Unable to resolve Docker Compose images."
    }

    foreach ($image in $images) {
        & docker image inspect $image *> $null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker image is not available locally: $image"
        }
    }

    $sourceCommit = (& git rev-parse HEAD).Trim()
    $dockerVersion = (& docker version --format '{{.Server.Version}}').Trim()
    $tarPath = Join-Path $outputRoot "$BundleName.tar"
    $archivePath = "$tarPath.zst"

    Write-Host "Exporting $($images.Count) images to $tarPath"
    & docker image save --output $tarPath @images
    if ($LASTEXITCODE -ne 0) {
        throw "docker image save failed."
    }

    Write-Host "Compressing with zstd to $archivePath"
    & $ZstdPath -T0 -6 -f $tarPath -o $archivePath
    if ($LASTEXITCODE -ne 0) {
        throw "zstd compression failed."
    }

    $partSize = [int64]$PartSizeMiB * 1MB
    $buffer = New-Object byte[] (8MB)
    $parts = [Collections.Generic.List[object]]::new()
    $source = [IO.File]::OpenRead($archivePath)
    try {
        $partNumber = 1
        while ($source.Position -lt $source.Length) {
            $partName = "{0}.part-{1:D3}" -f (Split-Path $archivePath -Leaf), $partNumber
            $partPath = Join-Path $outputRoot $partName
            $target = [IO.File]::Create($partPath)
            try {
                $remaining = [Math]::Min($partSize, $source.Length - $source.Position)
                while ($remaining -gt 0) {
                    $requested = [int][Math]::Min($buffer.Length, $remaining)
                    $read = $source.Read($buffer, 0, $requested)
                    if ($read -le 0) {
                        throw "Unexpected end of archive while creating $partName"
                    }
                    $target.Write($buffer, 0, $read)
                    $remaining -= $read
                }
            }
            finally {
                $target.Dispose()
            }
            $partFile = Get-Item -LiteralPath $partPath
            $parts.Add([ordered]@{
                name = $partFile.Name
                sizeBytes = $partFile.Length
                sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $partPath).Hash.ToLowerInvariant()
            })
            $partNumber++
        }
    }
    finally {
        $source.Dispose()
    }

    $imageManifest = foreach ($image in $images) {
        $details = (& docker image inspect $image | ConvertFrom-Json)[0]
        [ordered]@{
            name = $image
            id = $details.Id
            repoDigests = @($details.RepoDigests)
            os = $details.Os
            architecture = $details.Architecture
            sizeBytes = [int64]$details.Size
        }
    }

    $archiveFile = Get-Item -LiteralPath $archivePath
    $manifest = [ordered]@{
        schemaVersion = 1
        bundleName = $BundleName
        createdAt = [DateTimeOffset]::Now.ToString("o")
        sourceCommit = $sourceCommit
        dockerServerVersion = $dockerVersion
        platform = "linux/amd64"
        archive = [ordered]@{
            name = $archiveFile.Name
            sizeBytes = $archiveFile.Length
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant()
            compression = "zstd"
            partSizeMiB = $PartSizeMiB
        }
        images = @($imageManifest)
        parts = @($parts)
    }
    $manifestPath = Join-Path $outputRoot "$BundleName.manifest.json"
    $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding utf8

    $checksumsPath = Join-Path $outputRoot "$BundleName.SHA256SUMS"
    @(
        $parts | ForEach-Object { "$($_.sha256)  $($_.name)" }
        "$(($manifest.archive.sha256))  $($manifest.archive.name)"
    ) | Set-Content -LiteralPath $checksumsPath -Encoding ascii

    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "import-docker-release.ps1") -Destination $outputRoot -Force

    if (-not $KeepIntermediate) {
        Remove-Item -LiteralPath $tarPath -Force
        Remove-Item -LiteralPath $archivePath -Force
    }

    Write-Host "Docker release bundle created in $outputRoot"
    Get-ChildItem -LiteralPath $outputRoot | Sort-Object Name | Select-Object Name, Length
}
finally {
    Pop-Location
}
