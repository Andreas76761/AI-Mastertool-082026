param(
  [Parameter(Mandatory = $true)][string]$CatalogUrl,
  [Parameter(Mandatory = $true)][string]$AgentKey,
  [Parameter(Mandatory = $true)][string]$DeviceKey,
  [Parameter(Mandatory = $true)][string]$AppKey,
  [Parameter(Mandatory = $true)][int]$Port
)

# Der Token bleibt ausschließlich als lokale Umgebungsvariable auf dem jeweiligen Rechner.
if ([string]::IsNullOrWhiteSpace($env:CATALOG_AGENT_TOKEN)) {
  throw "CATALOG_AGENT_TOKEN ist auf diesem Rechner nicht gesetzt."
}

$url = "http://127.0.0.1:$Port/"
$started = Get-Date
try {
  $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 8
  $outcome = "available"
  $httpStatus = [int]$response.StatusCode
  $detail = "Lokaler Dienst antwortet."
} catch {
  $outcome = "unavailable"
  $httpStatus = $null
  $detail = $_.Exception.Message
}

$payload = @{
  agentKey = $AgentKey
  agentName = $env:COMPUTERNAME
  deviceKey = $DeviceKey
  operatingSystem = (Get-CimInstance Win32_OperatingSystem).Caption
  appKey = $AppKey
  localPort = $Port
  outcome = $outcome
  httpStatus = $httpStatus
  durationMs = [int]((Get-Date) - $started).TotalMilliseconds
  detail = $detail
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri "$CatalogUrl/api/agent/observe" -Method Post -ContentType "application/json" -Headers @{ Authorization = "Bearer $env:CATALOG_AGENT_TOKEN" } -Body $payload
