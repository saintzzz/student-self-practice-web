# Bundles machine-local state (secrets, CLI auth, Devin session summaries)
# into machine-transfer\ for copying to the second machine.
# NEVER commit the output - machine-transfer/ is gitignored.
# Run from repo root: powershell -File scripts/machine-export.ps1

$ErrorActionPreference = 'Stop'
$out = Join-Path $PSScriptRoot '..\machine-transfer'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Force -Path $out | Out-Null

$pairs = @(
  @{ src = "$env:APPDATA\devin\secrets";            dst = 'devin-secrets' },
  @{ src = "$env:USERPROFILE\.config\devin\secrets"; dst = 'config-devin-secrets' },
  @{ src = "$env:USERPROFILE\.codex";               dst = 'codex' },
  @{ src = "$env:APPDATA\devin\cli\summaries";      dst = 'devin-summaries' },
  @{ src = '.env.local';                            dst = 'env-local' }
)

foreach ($p in $pairs) {
  $repoRel = if ($p.src -like '.\*' -or $p.src -like '*.local') { Join-Path $PWD $p.src } else { $p.src }
  if (Test-Path $repoRel) {
    $target = Join-Path $out $p.dst
    if ((Get-Item $repoRel).PSIsContainer) {
      if ($p.dst -eq 'codex') {
        # codex dir holds 300MB+ of sqlite logs/memory - only auth+config matter
        New-Item -ItemType Directory -Force -Path $target | Out-Null
        Get-ChildItem $repoRel -File | Where-Object { $_.Name -notmatch '\.sqlite' } |
          Copy-Item -Destination $target -Force
      } else {
        Copy-Item $repoRel $target -Recurse -Force
      }
    } else {
      New-Item -ItemType Directory -Force -Path $out | Out-Null
      Copy-Item $repoRel (Join-Path $out '.env.local') -Force
    }
    Write-Host "exported $($p.src) -> $($p.dst)"
  } else {
    Write-Host "skip (missing): $($p.src)"
  }
}

Write-Host "`nDone -> $out"
Write-Host 'Copy machine-transfer\ to the iMac (USB/LAN/AirDrop), then run scripts/machine-import.sh there.'
