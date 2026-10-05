# Full regression run (PowerShell twin of run-regression.sh): client lint ->
# server API tests (Vitest) -> browser tests (Playwright), against the
# throwaway docker stack.
#
#   powershell -File data/scripts/run-regression.ps1          # everything
#   powershell -File data/scripts/run-regression.ps1 -Keep    # leave the test stack up
#
# See data/ai-build-docs/regression-testing/RUNBOOK.md.
param([switch]$Keep)

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$results = [ordered]@{}

function Invoke-Step($Name, $Dir, [string[]]$Cmd) {
  Write-Host "`n=== $Name ==="
  Push-Location (Join-Path $Root $Dir)
  & $Cmd[0] $Cmd[1..($Cmd.Length - 1)]
  $results[$Name] = if ($LASTEXITCODE -eq 0) { "PASS" } else { "FAIL" }
  Pop-Location
}

Write-Host "=== test stack (Postgres :5433, Mailpit :1026/:8026) ==="
Push-Location (Join-Path $Root "server")
npm run --silent test:db:up
$up = $LASTEXITCODE
Pop-Location
if ($up -ne 0) { Write-Host "Could not start the test stack (is Docker running?)"; exit 1 }

Invoke-Step "client lint" "client" @("npm", "run", "--silent", "lint")
Invoke-Step "server api (vitest)" "server" @("npm", "test", "--silent")
Invoke-Step "browser (playwright)" "client" @("npm", "run", "--silent", "test:e2e")

if (-not $Keep) {
  Push-Location (Join-Path $Root "server")
  npm run --silent test:db:down | Out-Null
  Pop-Location
}

Write-Host "`n=== summary ==="
$failed = $false
foreach ($k in $results.Keys) {
  Write-Host ("  {0,-22} {1}" -f $k, $results[$k])
  if ($results[$k] -ne "PASS") { $failed = $true }
}
if ($failed) {
  Write-Host "  Playwright report: client/playwright-report/index.html"
  exit 1
}
