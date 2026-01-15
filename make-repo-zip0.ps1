# make-repo-zip.ps1
# repoルートで「.\make-repo-zip.ps1」一発
# - repo一式をzip化
# - node_modules / .git / 各種キャッシュ・生成物 / glb等のバイナリは除外

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ----------------------------
# 設定（ここはデフォで十分なはず）
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

# 「glbなどのバイナリ」枠（必要最低限＋一般的な重いバイナリ）
$ExcludeExtensions = @(
  # 3D/重バイナリ
  ".glb", ".fbx", ".blend", ".stl", ".dae",
  # 実行物/ネイティブ
  ".exe", ".dll", ".so", ".dylib", ".a", ".lib", ".pdb",
  # JVM系
  ".class", ".jar", ".war", ".ear",
  # ネストアーカイブ（zipの中にzip要らん）
  ".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz", ".zst", ".iso"
)

# 余計なゴミだけ（ソースやlockは消さん）
$ExcludeFileGlobs = @(
  "*.log",
  ".DS_Store",
  "Thumbs.db"
)

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

function Should-ExcludeFile([System.IO.FileInfo]$fi) {
  $ext = [IO.Path]::GetExtension($fi.Name).ToLowerInvariant()
  if ($ExcludeExtensions -contains $ext) { return $true }
  foreach ($g in $ExcludeFileGlobs) {
    if ($fi.Name -like $g) { return $true }
  }
  return $false
}

function To-RelPath([string]$base, [string]$full) {
  $base = $base.TrimEnd('\','/')
  $uriBase = [Uri]::new($base + "\")
  $uriFull = [Uri]::new($full)
  return [Uri]::UnescapeDataString($uriBase.MakeRelativeUri($uriFull).ToString()) # "/"区切り
}

# ----------------------------
# 走査（node_modules等に潜らんように自前DFS）
# ----------------------------
$files = New-Object System.Collections.Generic.List[object]
$stack = New-Object System.Collections.Generic.Stack[string]
$stack.Push($RepoRoot)

while ($stack.Count -gt 0) {
  $dir = $stack.Pop()

  # サブディレクトリ
  foreach ($d in [IO.Directory]::EnumerateDirectories($dir)) {
    $name = [IO.Path]::GetFileName($d)
    if ($ExcludeDirNames -contains $name) { continue }
    $stack.Push($d)
  }

  # ファイル
  foreach ($f in [IO.Directory]::EnumerateFiles($dir)) {
    $fi = [IO.FileInfo]::new($f)
    if (Should-ExcludeFile $fi) { continue }
    $rel = To-RelPath $RepoRoot $fi.FullName
    $files.Add([pscustomobject]@{
      Full = $fi.FullName
      Rel = $rel
      Size = $fi.Length
      LastWriteUtc = $fi.LastWriteTimeUtc
    }) | Out-Null
  }
}

# ----------------------------
# zip作成（相対パス保持）
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
