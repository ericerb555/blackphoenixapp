@echo off
echo Downloading all updated files from Black Phoenix sandbox...

set TOKEN=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
set REPO=ericerb555/blackphoenixapp
set BASE=https://raw.githubusercontent.com/%REPO%/main

REM Download each changed file using PowerShell
powershell -Command "& { $files = @('src/app/pages/PublicStore.tsx','src/app/pages/Login.tsx','src/app/lib/rbac.ts','src/app/components/RoleSwitcher.tsx','src/app/pages/UnifiedDashboard.tsx','src/app/components/portals/AdminPortalView.tsx'); foreach ($f in $files) { $dir = Split-Path $f; if ($dir) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }; Write-Host ('Skipping ' + $f + ' - use manual copy') } }"

echo.
echo The files need to be copied manually from Figma Make.
echo See PUSH_TO_GITHUB.md for the list of files to update.
pause
