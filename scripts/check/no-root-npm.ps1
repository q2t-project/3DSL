# scripts/check/no-root-npm.ps1
# Root must be npm-free.
#
# Enforces:
# - No root package.json / package-lock.json / npm-shrinkwrap.json
# - No root node_modules
#
# Usage (PowerShell):
#   cd <repo-root>
#   powershell -ExecutionPolicy Bypass -File scripts/check/no-root-npm.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\\..')).Path

$Bad = @(
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'node_modules'
)

$Found = @()
foreach ($name in $Bad) {
  $p = Join-Path $RepoRoot $name
  if (Test-Path -LiteralPath $p) { $Found += $name }
}

if ($Found.Count -gt 0) {
  Write-Error ("Root must be npm-free. Found: {0}" -f ($Found -join ', '))
  exit 1
}

Write-Host 'OK: root is npm-free'
