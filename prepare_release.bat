@echo off
cd /d "%~dp0"
node tooling/scripts/prepare-release-changesets.mjs
pnpm biome check --write packages
if errorlevel 1 (
    echo.
    echo [warn] biome reported unfixable issues above, review before committing
    echo.
)
pnpm changeset
