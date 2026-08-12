param(
  [Parameter(Mandatory = $true)][string]$CatalogUrl,
  [Parameter(Mandatory = $true)][string]$AgentKey,
  [Parameter(Mandatory = $true)][string]$DeviceKey,
  [Parameter(Mandatory = $true)][string]$AppKey,
  [Parameter(Mandatory = $true)][int]$Port,
  [string]$EnrollmentCode
)

# Der Token bleibt ausschließlich als lokale Umgebungsvariable auf dem jeweiligen Rechner.
if ([string]::IsNullOrWhiteSpace($env:CATALOG_AGENT_TOKEN)) {
  if ([string]::IsNullOrWhiteSpace($EnrollmentCode)) {
    throw "Dieser Rechner ist noch nicht aktiviert. Erstelle im privaten Katalog einen Einmal-Code und übergib ihn mit -EnrollmentCode."
  }
  $enrollmentPayload = @{
    action = "redeem"
    agentKey = $AgentKey
    enrollmentCode = $EnrollmentCode
  } | ConvertTo-Json
  $enrollment = Invoke-RestMethod -Uri "$CatalogUrl/api/agent/enroll" -Method Post -ContentType "application/json" -Body $enrollmentPayload
  if ([string]::IsNullOrWhiteSpace($enrollment.token)) {
    throw "Die Aktivierung hat keinen gültigen lokalen Zugang erzeugt."
  }
  $env:CATALOG_AGENT_TOKEN = $enrollment.token
  [Environment]::SetEnvironmentVariable("CATALOG_AGENT_TOKEN", $enrollment.token, "User")
  Write-Host "Status-Agent wurde für diesen Windows-Benutzer aktiviert."
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
