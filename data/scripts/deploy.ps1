<#
.SYNOPSIS
    Redeploys the AidensRocks docker stack across two Proxmox LXC containers.

.USAGE
    .\deploy.ps1              # deploy to all nodes
    .\deploy.ps1 -Node 1      # deploy to just proxmox-1
    .\deploy.ps1 -Node 2      # deploy to just proxmox-2

.REQUIRES
    Windows OpenSSH client (built into Win10/11 - check with: Get-Command ssh)
    Passwordless SSH (key-based) as root to each Proxmox host.
#>

param(
    [ValidateSet("all", "1", "2")]
    [string]$Node = "all"
)

# ---------------------------------------------------------------------------
# Config - edit these to match your environment
# ---------------------------------------------------------------------------
$SshUser    = "root"
$SshKey     = "$env:USERPROFILE\.ssh\id_ed25519"   # change if you use a different key
$ComposeFile = "~/AidensRocks/data/docker-compose/docker-compose-prod.yml"
$RepoDir     = "~/AidensRocks"

$Nodes = @(
    @{ Host = "192.168.1.55"; Vmid = "1057" },
    @{ Host = "192.168.1.65"; Vmid = "1067" }
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Write-Info  { param($msg) Write-Host "[deploy] $msg" -ForegroundColor Green }
function Write-Warn2 { param($msg) Write-Host "[deploy] $msg" -ForegroundColor Yellow }
function Write-Err2  { param($msg) Write-Host "[deploy] $msg" -ForegroundColor Red }

function Deploy-Node {
    param(
        [string]$TargetHost,
        [string]$Vmid
    )

    Write-Info "=== Deploying to $TargetHost (CT $Vmid) ==="

    # Command run *inside* the LXC container.
    $remoteCmd = "cd $RepoDir && " +
                 "docker compose -f $ComposeFile down && " +
                 "git pull && " +
                 "docker compose -f $ComposeFile up --build -d && " +
                 "sleep 3 && " +
                 "docker compose -f $ComposeFile ps --status running"

    $sshTarget = "$SshUser@$TargetHost"
    $pctCmd    = "pct exec $Vmid -- bash -lc '$remoteCmd'"

    Write-Info "Connecting to $TargetHost..."

    $output = & ssh -i $SshKey -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 $sshTarget $pctCmd 2>&1
    $exitCode = $LASTEXITCODE

    $output | ForEach-Object { Write-Host $_ }

    if ($exitCode -ne 0) {
        Write-Err2 "Deploy failed on $TargetHost (CT $Vmid) - ssh exit code $exitCode"
        return $false
    }

    if ($output -match "running|Up") {
        Write-Info "OK: $TargetHost (CT $Vmid) is up"
        return $true
    } else {
        Write-Err2 "FAIL: $TargetHost (CT $Vmid) - no running containers detected after deploy"
        return $false
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
$failures = 0
$i = 0

foreach ($entry in $Nodes) {
    $i++
    if ($Node -ne "all" -and $Node -ne "$i") { continue }

    $ok = Deploy-Node -TargetHost $entry.Host -Vmid $entry.Vmid
    if (-not $ok) { $failures++ }
    Write-Host ""
}

if ($failures -gt 0) {
    Write-Err2 "$failures node(s) failed to deploy."
    exit 1
}

Write-Info "All nodes deployed successfully."