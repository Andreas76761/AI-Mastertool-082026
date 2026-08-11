param([string]$ScreenshotDirectory = (Join-Path $PSScriptRoot "..\public\screenshots"))

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
  throw "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen als lokale Umgebungsvariablen gesetzt sein."
}

$apiBase = $env:SUPABASE_URL.TrimEnd("/")
$headers = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"; "User-Agent" = "AI-Mastertool-Server/1.0" }
$rows = Invoke-RestMethod -Uri "$apiBase/rest/v1/app_screenshots?select=id,app_key,local_path" -Headers $headers
$imported = 0
$missing = @()

foreach ($row in $rows) {
  $fileName = [IO.Path]::GetFileName($row.local_path)
  $file = Join-Path $ScreenshotDirectory $fileName
  if (-not (Test-Path -LiteralPath $file)) {
    $missing += $fileName
    continue
  }

  $extension = [IO.Path]::GetExtension($file).ToLowerInvariant()
  $mime = switch ($extension) { ".png" { "image/png" } ".jpg" { "image/jpeg" } ".jpeg" { "image/jpeg" } ".webp" { "image/webp" } default { continue } }
  $storagePath = "$($row.app_key)/$fileName"
  $bytes = [IO.File]::ReadAllBytes($file)
  $uploadHeaders = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"; "x-upsert" = "true"; "User-Agent" = "AI-Mastertool-Server/1.0" }
  Invoke-WebRequest -Method Post -Uri "$apiBase/storage/v1/object/catalog-screenshots/$storagePath" -Headers $uploadHeaders -ContentType $mime -Body $bytes -UseBasicParsing | Out-Null

  $sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()
  $metadata = @{ storage_path = "catalog-screenshots/$storagePath"; mime_type = $mime; file_size_bytes = $bytes.Length; sha256 = $sha256 } | ConvertTo-Json -Compress
  Invoke-WebRequest -Method Patch -Uri "$apiBase/rest/v1/app_screenshots?id=eq.$($row.id)" -Headers $headers -ContentType "application/json" -Body $metadata -UseBasicParsing | Out-Null
  $imported++
}

[pscustomobject]@{ Imported = $imported; MissingFiles = $missing.Count; Missing = $missing -join ", " }
