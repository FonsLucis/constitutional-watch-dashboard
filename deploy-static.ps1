$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$stageDir = Join-Path $projectRoot "deploy"
$zipPath = Join-Path $projectRoot "constitutional-watch-dashboard-static.zip"

if (Test-Path $stageDir) {
  Remove-Item -Recurse -Force $stageDir
}

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Path $stageDir | Out-Null

$files = @(
  "index.html",
  "styles.css",
  "data.js",
  "app.js",
  "README.md",
  "Dockerfile",
  "nginx.conf",
  ".dockerignore"
)

foreach ($file in $files) {
  Copy-Item -Path (Join-Path $projectRoot $file) -Destination $stageDir
}

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force

Write-Output "Package created: $zipPath"
