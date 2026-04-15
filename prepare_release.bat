@echo off
cd /d "%~dp0"
node tooling/scripts/prepare-release-changesets.mjs

setlocal enabledelayedexpansion
set "HAS_MANUAL=0"
for %%f in (.changeset\*.md) do (
    if /i not "%%~nxf"=="README.md" (
        echo %%~nxf | findstr /b /i "auto-runtime-dependent-" >nul
        if errorlevel 1 set "HAS_MANUAL=1"
    )
)

if "!HAS_MANUAL!"=="1" (
    echo Manual changeset already exists, skipping interactive changeset creation.
) else (
    pnpm changeset
)
endlocal

pnpm biome check --write packages
if errorlevel 1 (
    echo.
    echo [warn] biome reported unfixable issues above, review before committing
    echo.
)
