$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Push-Location $ROOT

# Detect if we're resuming after conflict resolution
$mergeHead = Join-Path $ROOT ".git\MERGE_HEAD"
if (Test-Path $mergeHead) {
    Write-Host "Resuming after conflict resolution..." -ForegroundColor Cyan
} else {
    Write-Host "Fetching upstream..." -ForegroundColor Cyan
    git fetch upstream

    $mergeBase = git merge-base HEAD upstream/main
    $upstreamHead = git rev-parse upstream/main

    if ($mergeBase -eq $upstreamHead) {
        Write-Host "Already up to date with upstream." -ForegroundColor Green
        Pop-Location
        exit 0
    }

    $commitCount = (git rev-list --count "$mergeBase..$upstreamHead")
    Write-Host "$commitCount new commit(s) from upstream." -ForegroundColor Cyan

    Write-Host "`nMerging upstream/main..." -ForegroundColor Cyan
    git merge upstream/main --no-edit
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`nMerge conflicts detected. Resolve them, then run this script again to continue." -ForegroundColor Yellow
        Pop-Location
        exit 1
    }
}

# Snapshot lockfile hash before renames
$lockBefore = if (Test-Path pnpm-lock.yaml) { (Get-FileHash pnpm-lock.yaml).Hash } else { "" }

Write-Host "`nApplying @lofcz/ renames..." -ForegroundColor Cyan
node scripts/rename-to-lofcz.mjs

Write-Host "`nConverting upstream changesets..." -ForegroundColor Cyan
node scripts/convert-changesets.mjs

# Only install if lockfile or package.json deps changed
$lockAfter = if (Test-Path pnpm-lock.yaml) { (Get-FileHash pnpm-lock.yaml).Hash } else { "" }
$depsChanged = & git diff --name-only HEAD~1 2>&1 | Out-String
$needsInstall = ($lockBefore -ne $lockAfter) -or ($depsChanged -match "package\.json|pnpm-lock")

if ($needsInstall) {
    Write-Host "`nDependencies changed, installing..." -ForegroundColor Cyan
    pnpm install --no-frozen-lockfile
} else {
    Write-Host "`nNo dependency changes, skipping install." -ForegroundColor DarkGray
}

# Check if upstream moved ahead during conflict resolution
git fetch upstream --quiet
$newBase = git merge-base HEAD upstream/main
$newHead = git rev-parse upstream/main
if ($newBase -ne $newHead) {
    $remaining = (git rev-list --count "$newBase..$newHead")
    Write-Host "`nSync complete, but upstream has $remaining more commit(s). Run this script again." -ForegroundColor Yellow
} else {
    Write-Host "`nSync complete." -ForegroundColor Green
}
Pop-Location
