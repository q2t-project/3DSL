@echo off
setlocal

cd /d %~dp0\..\..

REM root must be npm-free
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check\no-root-npm.ps1
if errorlevel 1 exit /b 1

REM lock must not contain ../..
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$hit=Select-String -Path apps/site/package-lock.json -Pattern '\.\./\.\.' -ErrorAction SilentlyContinue; ^
   if($hit){Write-Error 'LOCK INFECTED: ../.. detected in apps/site/package-lock.json'; exit 1} ^
   Write-Host 'OK: lock has no ../..'"

if errorlevel 1 exit /b 1
echo OK: site sanity passed
endlocal
