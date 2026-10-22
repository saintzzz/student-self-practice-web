# One-command handoff sync for switching between this machine and the iMac.
#
#   powershell -File scripts/machine-sync.ps1 [-PushRepo]
#
# Steps:
#   1. machine-export.ps1 -> fresh machine-transfer\ (secrets, codex auth,
#      devin summaries, .env.local)
#   2. tar+gzip -> AES-256 encrypt -> secrets-context.tar.enc inside the
#      handoff-vault clone at ..\machine-transfer-repo
#   3. commit + push the vault repo
#   4. -PushRepo also commits nothing but pushes this repo's current branch
#      (commit your work first - this script never auto-commits source)
#
# Passphrase resolution order (never hardcoded here):
#   $env:VAULT_PASS  ->  %USERPROFILE%\.devin-vault-pass  ->  prompt once,
#   then saved to that file so later runs are zero-friction.
param([switch]$PushRepo)
$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$vaultRepo = Join-Path $repoRoot '..\machine-transfer-repo'
$passFile = Join-Path $env:USERPROFILE '.devin-vault-pass'

if (-not (Test-Path (Join-Path $vaultRepo '.git'))) {
  throw "handoff-vault clone not found at $vaultRepo - clone saintzzz/handoff-vault there first"
}

# --- passphrase ---
$pass = $env:VAULT_PASS
if (-not $pass -and (Test-Path $passFile)) { $pass = (Get-Content $passFile -Raw).Trim() }
if (-not $pass) {
  $pass = Read-Host 'Vault passphrase'
  Set-Content -Path $passFile -Value $pass -NoNewline
  Write-Host "saved passphrase to $passFile (outside any repo)"
}

# --- 1. export fresh local state ---
powershell -File (Join-Path $PSScriptRoot 'machine-export.ps1')
$mt = Join-Path $repoRoot 'machine-transfer'
if (-not (Test-Path $mt)) { throw 'machine-export produced no machine-transfer dir' }

# --- 2. tar+gzip then openssl encrypt (matches machine-import.sh decrypt flags) ---
$encTmp = Join-Path $repoRoot 'secrets-context.tar.enc'
$env:VAULT_PASS = $pass
Push-Location $repoRoot
try {
  # Relative paths only - Windows backslash paths get mangled inside bash -c.
  bash -c "tar -czf - machine-transfer | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:VAULT_PASS -out secrets-context.tar.enc"
  if ($LASTEXITCODE -ne 0) { throw "encrypt failed (exit $LASTEXITCODE)" }
} finally { Pop-Location }
$encOut = Join-Path $vaultRepo 'secrets-context.tar.enc'
Move-Item $encTmp $encOut -Force
Write-Host "encrypted -> $encOut"

# --- 3. commit + push vault ---
Push-Location $vaultRepo
try {
  git add secrets-context.tar.enc
  $dirty = git status --porcelain -- secrets-context.tar.enc
  if ($dirty) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    git commit -m "sync $stamp (windows)" --quiet
    git push --quiet
    Write-Host 'vault pushed'
  } else {
    Write-Host 'vault unchanged (identical bundle) - skipped'
  }
} finally { Pop-Location }

# --- 4. optional: push this repo ---
if ($PushRepo) {
  Push-Location $repoRoot
  try { git push } finally { Pop-Location }
}

Write-Host "`nSync done. On the iMac: cd repo && git pull && bash scripts/machine-import.sh <path>/handoff-vault"
