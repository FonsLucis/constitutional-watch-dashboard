$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stageDir = Join-Path $projectRoot "deploy-dynamic"
$zipPath = Join-Path $projectRoot "constitutional-watch-dashboard-dynamic.zip"

if (Test-Path $stageDir) {
  Remove-Item -Recurse -Force $stageDir
}

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Path $stageDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stageDir "storage") | Out-Null

$files = @(
  "package.json",
  "server.js",
  "index.html",
  "styles.css",
  "data.js",
  "app.js",
  "render.yaml",
  "Dockerfile",
  ".dockerignore",
  "README.md"
)

foreach ($file in $files) {
  Copy-Item -Path (Join-Path $projectRoot $file) -Destination $stageDir
}

Copy-Item -Path (Join-Path $projectRoot "storage\\db.json") -Destination (Join-Path $stageDir "storage\\db.json")

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force

Write-Output "Dynamic package created: $zipPath"
