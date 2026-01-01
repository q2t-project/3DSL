param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$OutDir = (Join-Path (Resolve-Path ".").Path "_ulzip"),
  [ValidateSet("working","tracked")]
  [string]$Mode = "working",
  [string[]]$Bundles = @("root","site","viewer","schemas","vendor")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null }
}

function Remove-DirSafe([string]$p) {
  if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}

function Robocopy-CopyTree {
  param(
    [Parameter(Mandatory=$true)][string]$SrcDir,
    [Parameter(Mandatory=$true)][string]$DstDir,
    [string[]]$XD = @(),
    [string[]]$XF = @()
  )
  Ensure-Dir $DstDir

  $args = @(
    $SrcDir, $DstDir,
    "/E",                 # include empty dirs
    "/R:1", "/W:1",       # retry
    "/NFL","/NDL","/NJH","/NJS","/NP"  # quiet
  )

  if ($XD.Count -gt 0) { $args += @("/XD") + $XD }
  if ($XF.Count -gt 0) { $args += @("/XF") + $XF }

  & robocopy @args | Out-Null

  # robocopy exit code: 0-7 success, 8+ failure
  if ($LASTEXITCODE -ge 8) {
    throw "robocopy failed (exit=$LASTEXITCODE) src=$SrcDir dst=$DstDir"
  }
}

function Write-Manifest {
  param(
    [Parameter(Mandatory=$true)][string]$StageRoot,
    [Parameter(Mandatory=$true)][string]$Timestamp,
    [Parameter(Mandatory=$true)][string]$Mode,
    [Parameter(Mandatory=$true)][string[]]$Bundles
  )
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add("timestamp=$Timestamp")
  $lines.Add("mode=$Mode")
  $lines.Add("repoRoot=$RepoRoot")
  $lines.Add("bundles=" + ($Bundles -join ","))

  try {
    $head = & git -C $RepoRoot rev-parse HEAD 2>$null
    if ($head) { $lines.Add("gitHead=$head") }
  } catch {}

  $manifestPath = Join-Path $StageRoot "__ulzip_manifest.txt"
  $lines | Set-Content -Encoding UTF8 $manifestPath
}

function Zip-Stage {
  param(
    [Parameter(Mandatory=$true)][string]$StageRoot,
    [Parameter(Mandatory=$true)][string]$ZipPath
  )
  if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
  Compress-Archive -Path (Join-Path $StageRoot "*") -DestinationPath $ZipPath -CompressionLevel Optimal
}

# ---- bundle definitions ----
# “include” は SSOT/必要ソース中心。site の public は生成物混入を避けるため一部除外。
$BundleDefs = @{
  root = @{
    type="meta"
    # root bundleは「全repo」じゃなく、上位の設定ファイル系だけ（必要なら増やして）
    files=@(
      "package.json","package-lock.json","npm-shrinkwrap.json",".npmrc",
      ".gitignore",".gitattributes",".editorconfig",
      "README.md","README.txt","LICENSE","LICENSE.txt"
    )
    dirs=@("scripts",".vscode")
  }
  site = @{
    type="tree"
    includes=@("apps/site")
    xd=@("node_modules",".astro","dist","build",".cache","coverage","tmp",".tmp",".git")
    xf=@("*.log")
    # site/public の生成物は除外（必要ならここを調整）
    sitePublicXD=@("public\viewer","public\vendor","public\schemas")
  }
  viewer = @{
    type="tree"
    includes=@("apps/viewer/viewer")
    xd=@("node_modules","dist","build",".cache","coverage","tmp",".tmp",".git")
    xf=@("*.log")
  }
  schemas = @{
    type="tree"
    includes=@("packages/schemas")
    xd=@("node_modules","dist","build",".cache","coverage","tmp",".tmp",".git")
    xf=@("*.log")
  }
  vendor = @{
    type="tree"
    includes=@("packages/vendor")
    xd=@("node_modules","dist","build",".cache","coverage","tmp",".tmp",".git")
    xf=@("*.log")
  }
}

Ensure-Dir $OutDir
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")

function Make-TrackedZip {
  param(
    [Parameter(Mandatory=$true)][string]$ZipPath,
    [Parameter(Mandatory=$true)][string[]]$Pathspecs
  )
  # tracked only: HEAD基準（未コミット変更は入らん）
  & git -C $RepoRoot archive --format=zip --output=$ZipPath HEAD -- @Pathspecs
  if ($LASTEXITCODE -ne 0) { throw "git archive failed (exit=$LASTEXITCODE)" }
}

foreach ($b in $Bundles) {
  if (-not $BundleDefs.ContainsKey($b)) { throw "unknown bundle: $b" }
  $def = $BundleDefs[$b]
  $zipName = "{0}_{1}_{2}.zip" -f $b, $Mode, $Timestamp
  $zipPath = Join-Path $OutDir $zipName

  if ($Mode -eq "tracked") {
    # ---- tracked mode ----
    if ($def.type -eq "tree") {
      Make-TrackedZip -ZipPath $zipPath -Pathspecs $def.includes
    } else {
      # meta: files/dirs だけまとめる
      $ps = @()
      foreach ($f in $def.files) { if (Test-Path (Join-Path $RepoRoot $f)) { $ps += $f } }
      foreach ($d in $def.dirs)  { if (Test-Path (Join-Path $RepoRoot $d)) { $ps += $d } }
      if ($ps.Count -eq 0) { Write-Warning "root meta bundle: nothing found to archive"; continue }
      Make-TrackedZip -ZipPath $zipPath -Pathspecs $ps
    }
    Write-Host "OK(tracked): $zipPath"
    continue
  }

  # ---- working tree mode ----
  $stage = Join-Path $env:TEMP ("ulzip_{0}_{1}" -f $b, $Timestamp)
  Remove-DirSafe $stage
  Ensure-Dir $stage
  Write-Manifest -StageRoot $stage -Timestamp $Timestamp -Mode $Mode -Bundles $Bundles

  if ($def.type -eq "tree") {
    foreach ($rel in $def.includes) {
      $src = Join-Path $RepoRoot $rel
      if (-not (Test-Path $src)) { Write-Warning "skip missing: $src"; continue }

      $dst = Join-Path $stage $rel
      Ensure-Dir (Split-Path $dst -Parent)

      $xd = @() + $def.xd
      $xf = @() + $def.xf

      if ($b -eq "site" -and $def.ContainsKey("sitePublicXD")) {
        $xd += $def.sitePublicXD
      }

      Robocopy-CopyTree -SrcDir $src -DstDir $dst -XD $xd -XF $xf
    }
  } else {
    # meta: root files/dirs allowlist copy
    foreach ($f in $def.files) {
      $src = Join-Path $RepoRoot $f
      if (Test-Path $src) {
        Copy-Item -Force $src (Join-Path $stage $f)
      }
    }
    foreach ($d in $def.dirs) {
      $src = Join-Path $RepoRoot $d
      if (Test-Path $src) {
        $dst = Join-Path $stage $d
        Robocopy-CopyTree -SrcDir $src -DstDir $dst -XD @("node_modules",".git") -XF @("*.log")
      }
    }
  }

  Zip-Stage -StageRoot $stage -ZipPath $zipPath
  Remove-DirSafe $stage

  Write-Host "OK(working): $zipPath"
}

Write-Host "`nOutput dir: $OutDir"
