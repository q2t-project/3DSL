# make-ul-zips.ps1
# 목적: ChatGPT サンドボックスにアップロードするための "repo同期用" ZIP を作る
# - 外部モジュール/生成物/大容量を除外して、ソース中心の最小パック化
# - デフォルトは複数ZIP（viewer/site/scripts 等）に分ける
# - manifest(sha256) を出す

[CmdletBinding()]
param(
  # 既定の収集セット
  # sandbox-min : ソース中心(推奨)
  # sandbox-all : public等も少し含める（必要なら）
  # custom      : -Targets で明示
  [ValidateSet("sandbox-min","sandbox-all","custom")]
  [string]$Profile = "sandbox-min",

  # custom 時の対象ルート（repo root からの相対パス）
  # 例: -Targets @("apps/viewer","apps/site/src","apps/site/scripts")
  [string[]]$Targets = @(),

  # 出力ディレクトリ（未指定なら <repo>/_ul_zips）
  [string]$OutDir = "",

  # 1つのZIPにまとめる（既定は分割）
  [switch]$SingleZip,

  # 既存zip/manifestを削除
  [switch]$Clean,

  # ファイルサイズ上限(MB)。超えたらエラー
  [int]$MaxFileMB = 25,

  # 乾式（ステージングとファイル列挙まで、ZIPは作らん）
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Find-RepoRoot([string]$startDir) {
  $p = Resolve-Path $startDir
  for ($i=0; $i -lt 16; $i++) {
    if (Test-Path (Join-Path $p ".git")) { return $p }
    if (Test-Path (Join-Path $p "apps")) { return $p } # 予備
    $parent = Split-Path $p -Parent
    if ($parent -eq $p) { break }
    $p = $parent
  }
  throw "repo root が見つからへん（.git / apps が見つからん）。実行場所を repo 配下にして。"
}

function Ensure-Dir([string]$dir) {
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}

function Assert-RelativeSafe([string]$rel) {
  if ([string]::IsNullOrWhiteSpace($rel)) { throw "Targets に空が混じってる" }
  if ($rel.Contains("..")) { throw "Targets に '..' は禁止: $rel" }
  if ($rel.StartsWith("\") -or $rel.StartsWith("/")) { throw "Targets は相対パスのみ: $rel" }
}

# ---- 目的: 外部モジュール/生成物/機密/大容量を徹底除外 ----
$ExcludeDirs = @(
  ".git",".github","node_modules",
  "dist","build","out",".next",".nuxt",".astro",
  ".turbo",".cache","coverage",
  ".wrangler",".vercel",
  "vendor", # 3rd party を丸ごと落としたい場合はこれで効く
  "_ul_zips","_ul","_tmp","tmp","temp"
)

# プロジェクト固有で「でかい/不要」になりやすい場所（必要なら追加）
$ExcludeDirs += @(
  "apps/site/public/viewer/vendor",
  "apps/site/public/vendor",
  "apps/site/public/3dss",          # distミラーは基本不要（必要なら sandbox-all で入れる）
  "packages/3dss-content/dist"      # 生成物
)

$ExcludeFiles = @(
  "*.zip","*.7z","*.rar",
  "*.log","*.tmp","*.bak","*.swp",
  ".DS_Store","Thumbs.db"
)

# 機密系（誤爆防止）
$ExcludeFiles += @(
  ".env",".env.*","*.pem","*.key","*.pfx","id_rsa","id_ed25519","*.crt"
)

# 大容量になりやすいアセット（必要なら Profile で緩める）
$ExcludeFilesSandboxMin = @(
  "*.psd","*.ai","*.blend",
  "*.mp4","*.mov","*.mkv",
  "*.glb","*.gltf","*.fbx",
  "*.png","*.jpg","*.jpeg","*.webp",
  "*.wav","*.mp3","*.ogg"
)

# ---- プロファイルごとの対象 ----
$DefaultTargetsSandboxMin = @(
  "apps/viewer",
  "apps/site/src",
  "apps/site/scripts",
  "packages/3dss-content/scripts",
  "packages/3dss-content/library",   # ここは重くなりがち。MaxFileMBで止める
  "packages/3dss-schema",            # スキーマ置き場が別なら適宜調整
  "DEVOPS_site.md",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json"
)

$DefaultTargetsSandboxAll = @(
  "apps/viewer",
  "apps/site/src",
  "apps/site/scripts",
  "apps/site/public",                # ただし上の ExcludeDirs で vendor / 3dss は落ちる
  "packages/3dss-content/scripts",
  "packages/3dss-content/library",
  "packages/3dss-schema",
  "DEVOPS_site.md",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json"
)

# ---- main ----
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot  = Find-RepoRoot $scriptDir

if ([string]::IsNullOrWhiteSpace($OutDir)) {
  $OutDir = Join-Path $repoRoot "_ul_zips"
}
Ensure-Dir $OutDir

if ($Clean) {
  Get-ChildItem -Path $OutDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '\.zip$|manifest\.json$' } |
    Remove-Item -Force -ErrorAction SilentlyContinue
}

# 対象決定
[string[]]$UseTargets =
  switch ($Profile) {
    "sandbox-min" { $DefaultTargetsSandboxMin }
    "sandbox-all" { $DefaultTargetsSandboxAll }
    "custom" {
      if (-not $Targets -or $Targets.Count -eq 0) { throw "Profile=custom のときは -Targets が必須やで" }
      $Targets
    }
  }

foreach ($t in $UseTargets) { Assert-RelativeSafe $t }

# sandbox-min のときは画像等を更に落とす（軽量化最優先）
$UseExcludeFiles = @($ExcludeFiles)
if ($Profile -eq "sandbox-min") { $UseExcludeFiles += $ExcludeFilesSandboxMin }

# robocopy 用に /XD /XF を組み立て
function Build-RobocopyArgs([string]$src, [string]$dst) {
  $args = @(
    "`"$src`"", "`"$dst`"",
    "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP",
    "/R:1", "/W:1"
  )

  if ($ExcludeDirs.Count -gt 0) {
    $args += "/XD"
    foreach ($d in $ExcludeDirs) { $args += "`"$d`"" }
  }
  if ($UseExcludeFiles.Count -gt 0) {
    $args += "/XF"
    foreach ($f in $UseExcludeFiles) { $args += "`"$f`"" }
  }
  return $args
}

function Invoke-Robocopy([string]$src, [string]$dst) {
  Ensure-Dir $dst
  $args = Build-RobocopyArgs $src $dst
  $cmd = "robocopy " + ($args -join " ")

  # 実行
  $p = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $cmd) -NoNewWindow -Wait -PassThru

  # robocopy の戻り値: 0-7 は成功扱い（コピー無し含む）、8以上はエラー
  if ($p.ExitCode -ge 8) {
    throw "robocopy error(exit=$($p.ExitCode)) src=$src"
  }
}

function Add-File([string]$srcFile, [string]$dstDir) {
  Ensure-Dir $dstDir
  Copy-Item -LiteralPath $srcFile -Destination (Join-Path $dstDir (Split-Path $srcFile -Leaf)) -Force
}

# ステージング
$stageRoot = Join-Path $env:TEMP ("3dsl_ul_stage_" + [Guid]::NewGuid().ToString("N"))
Ensure-Dir $stageRoot

$manifest = [System.Collections.Generic.List[object]]::new()

try {
  foreach ($rel in $UseTargets) {
    $abs = Join-Path $repoRoot $rel
    if (-not (Test-Path $abs)) {
      # ファイルの可能性もある
      Write-Warning "skip(not found): $rel"
      continue
    }

    $nameSafe = ($rel -replace '[\\/:*?"<>| ]','_')
    $dst = Join-Path $stageRoot $nameSafe

    if ((Get-Item $abs).PSIsContainer) {
      Invoke-Robocopy $abs $dst
    } else {
      Ensure-Dir $dst
      Add-File $abs $dst
    }

    # サイズチェック
    $tooBig = Get-ChildItem -LiteralPath $dst -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -gt ($MaxFileMB * 1MB) } |
      Select-Object -First 5

    if ($tooBig) {
      $list = ($tooBig | ForEach-Object { "$($_.FullName) ($([math]::Round($_.Length/1MB,1))MB)" }) -join "`n"
      throw "MaxFileMB超過($MaxFileMB MB). 例:`n$list`n`n必要なら -MaxFileMB を上げるか、除外に回して。"
    }

    $manifest.Add([pscustomobject]@{
      target = $rel
      staged = $dst
    })
  }

  if ($DryRun) {
    Write-Host "DRY RUN: stage ready -> $stageRoot"
    Write-Host ("Targets: " + ($UseTargets -join ", "))
    return
  }

  # ZIP作成
  $zipList = [System.Collections.Generic.List[object]]::new()

  if ($SingleZip) {
    $zipPath = Join-Path $OutDir "ul_bundle.zip"
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
    Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -Force
    $sha = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
    $zipList.Add([pscustomobject]@{ zip = $zipPath; sha256 = $sha })
  } else {
    foreach ($item in Get-ChildItem -Path $stageRoot -Directory) {
      $zipPath = Join-Path $OutDir ($item.Name + ".zip")
      if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
      Compress-Archive -Path $item.FullName -DestinationPath $zipPath -Force
      $sha = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash
      $zipList.Add([pscustomobject]@{ zip = $zipPath; sha256 = $sha })
    }
  }

  # manifest
  $outManifest = Join-Path $OutDir "ul_manifest.json"
  $payload = [pscustomobject]@{
    profile = $Profile
    created_at = (Get-Date).ToString("s")
    max_file_mb = $MaxFileMB
    exclude_dirs = $ExcludeDirs
    exclude_files = $UseExcludeFiles
    targets = $UseTargets
    zips = $zipList
  }
  $payload | ConvertTo-Json -Depth 6 | Set-Content -Path $outManifest -Encoding UTF8

  Write-Host ("OK -> {0}" -f (Resolve-Path $OutDir).Path)
  Write-Host ("manifest -> {0}" -f (Resolve-Path $outManifest).Path)
  foreach ($z in $zipList) {
    Write-Host ("zip: {0} sha256={1}" -f (Resolve-Path $z.zip).Path, $z.sha256)
  }
}
finally {
  if (Test-Path $stageRoot) {
    Remove-Item $stageRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
