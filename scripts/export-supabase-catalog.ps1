param([Parameter(Mandatory = $true)][string]$OutputDirectory)

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) {
  throw "SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen lokal als Umgebungsvariablen gesetzt sein."
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$headers = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY" }
foreach ($table in @("catalog_apps", "catalog_chats", "catalog_documents", "app_screenshots", "app_test_runs", "device_statuses", "deployment_events")) {
  $content = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/$table?select=*" -Headers $headers
  $content | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $OutputDirectory "$table.json") -Encoding utf8
}
