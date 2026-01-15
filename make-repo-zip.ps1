# make-repo-zip.ps1
# repoルートで「.\make-repo-zip.ps1」一発
# - repo一式をzip化（相対パス保持）
# - 3DSL向け: node_modules/.git だけやなく、vendor(three/ajv等)や site/public の注入物も除外

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ----------------------------
# 除外: フォルダ名（どこにあっても切る）
# ----------------------------
$ExcludeDirNames = @(
  ".git",
  "node_modules",
  "bower_components",
  "jspm_packages",
  ".pnpm-store",
  ".yarn",
  ".pnp",
  ".cache",
  ".turbo",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".vite",
  ".parcel-cache",
  "dist",
  "build",
  "out",
  "coverage",
  "tmp",
  "temp",
  "_out",
  "_tmp"
)

# ----------------------------
# 除外: 3DSL “専用”のパス（ルート相対の prefix で切る）
# ここが肝: three/ajv みたいな vendor 同梱、site側の注入コピーを切る
# ----------------------------
$ExcludeDirPrefixes = @(
  # shared vendor（three / i18next / ajv など）
  "vendor",
  "packages/vendor",

  # site 側に配るコピー（syncで生成/注入される塊）
  "apps/site/public/viewer",
  "apps/site/public/vendor",
  "apps/site/public/schemas",
  "apps/site/public/3dss",
  "apps/site/public/library",

  # docs/faq のミラー（packages/docs を正とするならこっちは不要）
  "apps/site/src/content/docs",
  "apps/site/src/content/faq"
)

# ----------------------------
# 除外: 拡張子（重い/実行物/ネストアーカイブ等）
# ----------------------------
$ExcludeExtensions = @(
  ".glb", ".fbx", ".blend", ".stl", ".dae",
  ".exe", ".dll", ".so", ".dylib", ".a", ".lib", ".pdb",
  ".class", ".jar", ".war", ".ear",
  ".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz", ".zst", ".iso"
)

# 余計なゴミだけ（lockは残す）
$ExcludeFileGlobs = @("*.log", ".DS_Store", "Thumbs.db")

# ----------------------------
# repo root = スクリプトのある場所（=repoルート想定）
# ----------------------------
$RepoRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$RepoName = Split-Path -Leaf $RepoRoot

$OutDir = Join-Path $RepoRoot "_out"
if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ZipName = "${RepoName}_repo_${Stamp}"
$ZipPath = Join-Path $OutDir ("{0}.zip" -f $ZipName)
$ManifestPath = Join-Path $OutDir ("{0}.manifest.tsv" -f $ZipName)
$ShaPath = Join-Path $OutDir ("{0}.zip.sha256" -f $ZipName)

if (Test-Path -LiteralPath $ZipPath) { Remove-Item -Force -LiteralPath $ZipPath }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function To-RelPath([string]$base, [string]$full) {
  $base = $base.TrimEnd('\','/')
  $uriBase = [Uri]::new($base + "\")
  $uriFull = [Uri]::new($full)
  return [Uri]::UnescapeDataString($uriBase.MakeRelativeUri($uriFull).ToString()) # "/"区切り
}

function Is-ExcludedPrefix([string]$rel, [string[]]$prefixes) {
  foreach ($p in $prefixes) {
    if ($rel -eq $p) { return $true }
    if ($rel -like ($p + "/*")) { return $true } # * は / も跨いでマッチする
  }
  return $false
}

function Should-ExcludeFile([System.IO.FileInfo]$fi) {
  $ext = [IO.Path]::GetExtension($fi.Name).ToLowerInvariant()
  if ($ExcludeExtensions -contains $ext) { return $true }
  foreach ($g in $ExcludeFileGlobs) {
    if ($fi.Name -like $g) { return $true }
  }
  return $false
}

# ----------------------------
# 走査（除外prefixに入ったら潜らん）
# ----------------------------
$files = New-Object System.Collections.Generic.List[object]
$stack = New-Object System.Collections.Generic.Stack[string]
$stack.Push($RepoRoot)

while ($stack.Count -gt 0) {
  $dir = $stack.Pop()
  $dirRel = To-RelPath $RepoRoot $dir
  if ($dir -ne $RepoRoot) {
    if (Is-ExcludedPrefix $dirRel $ExcludeDirPrefixes) { continue }
  }

  foreach ($d in [IO.Directory]::EnumerateDirectories($dir)) {
    $name = [IO.Path]::GetFileName($d)
    if ($ExcludeDirNames -contains $name) { continue }
    $rel = To-RelPath $RepoRoot $d
    if (Is-ExcludedPrefix $rel $ExcludeDirPrefixes) { continue }
    $stack.Push($d)
  }

  foreach ($f in [IO.Directory]::EnumerateFiles($dir)) {
    $fi = [IO.FileInfo]::new($f)
    if (Should-ExcludeFile $fi) { continue }
    $rel = To-RelPath $RepoRoot $fi.FullName
    if (Is-ExcludedPrefix $rel $ExcludeDirPrefixes) { continue }
    $files.Add([pscustomobject]@{
      Full = $fi.FullName
      Rel  = $rel
      Size = $fi.Length
      LastWriteUtc = $fi.LastWriteTimeUtc
    }) | Out-Null
  }
}

# ----------------------------
# zip作成
# ----------------------------
$fs = [System.IO.File]::Open($ZipPath, [System.IO.FileMode]::CreateNew)
try {
  $zip = [System.IO.Compression.ZipArchive]::new($fs, [System.IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    $i = 0
    $total = $files.Count
    foreach ($it in $files) {
      $i++
      if ($total -gt 0 -and ($i % 500 -eq 0)) {
        Write-Progress -Activity "Zipping..." -Status "$i / $total" -PercentComplete (($i * 100.0) / $total)
      }
      $entry = $zip.CreateEntry($it.Rel, [System.IO.Compression.CompressionLevel]::Optimal)
      $inStream = [System.IO.File]::OpenRead($it.Full)
      try {
        $outStream = $entry.Open()
        try { $inStream.CopyTo($outStream) } finally { $outStream.Dispose() }
      } finally { $inStream.Dispose() }
    }
    Write-Progress -Activity "Zipping..." -Completed
  } finally {
    $zip.Dispose()
  }
} finally {
  $fs.Dispose()
}

# ----------------------------
# manifest + zip sha256
# ----------------------------
"rel_path`tbytes`tlast_write_utc" | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
foreach ($it in $files) {
  "{0}`t{1}`t{2:o}" -f $it.Rel, $it.Size, $it.LastWriteUtc | Add-Content -LiteralPath $ManifestPath -Encoding UTF8
}

$zipHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
"$zipHash  $(Split-Path -Leaf $ZipPath)" | Set-Content -LiteralPath $ShaPath -Encoding ASCII

Write-Host "OK: $ZipPath"
Write-Host "OK: $ManifestPath"
Write-Host "OK: $ShaPath"
Write-Host ("Files: {0}" -f $files.Count)
