# Render tools\resume\resume.html to assets\resume\pierson-norris-resume.pdf
# with headless Chrome or Edge (no header/footer, backgrounds on).
#
#   powershell -ExecutionPolicy Bypass -File tools\resume\build.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$src = Join-Path $PSScriptRoot 'resume.html'
$out = Join-Path $root 'assets\resume\pierson-norris-resume.pdf'

$browser = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge not found' }

$url = ([System.Uri]$src).AbsoluteUri   # file:///C:/.../PN%20Website%20Project/...
# A throwaway profile, so this never touches (or waits on) the Chrome you have open.
$profile = Join-Path $env:TEMP ('resume-chrome-' + [guid]::NewGuid())
if (Test-Path $out) { Remove-Item $out }
Start-Process -FilePath $browser -Wait -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
  "--user-data-dir=`"$profile`"", "--print-to-pdf=`"$out`"", $url)
Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
$f = Get-Item $out
"{0} {1}KB" -f $f.Name, [math]::Round($f.Length / 1KB)
