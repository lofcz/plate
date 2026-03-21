param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

# All publishable packages in topological (dependency) order.
# Leaves first, then packages that depend on them, ending with the umbrella.
$packages = @(
    # Tier 0: no internal deps
    "packages/udecode/utils"
    "packages/udecode/cmdk"
    "packages/udecode/depset"
    "packages/udecode/react-hotkeys"

    # Tier 1: depends on udecode/utils
    "packages/udecode/react-utils"
    "packages/slate"

    # Tier 2: depends on tier 1
    "packages/udecode/cn"
    "packages/core"

    # Tier 3: depends on core/slate
    "packages/utils"
    "packages/diff"
    "packages/indent"
    "packages/floating"
    "packages/combobox"
    "packages/resizable"

    # Tier 4: depends on tier 3
    "packages/suggestion"
    "packages/table"
    "packages/link"
    "packages/list"
    "packages/toggle"
    "packages/emoji"
    "packages/mention"
    "packages/slash-command"
    "packages/code-drawing"

    # Tier 5: depends on table
    "packages/csv"
    "packages/selection"
    "packages/markdown"

    # Tier 6: depends on suggestion/markdown/etc
    "packages/ai"

    # Leaf packages (no internal deps, order doesn't matter)
    "packages/autoformat"
    "packages/basic-nodes"
    "packages/basic-styles"
    "packages/callout"
    "packages/caption"
    "packages/code-block"
    "packages/comment"
    "packages/cursor"
    "packages/date"
    "packages/dnd"
    "packages/docx"
    "packages/docx-io"
    "packages/excalidraw"
    "packages/find-replace"
    "packages/juice"
    "packages/layout"
    "packages/list-classic"
    "packages/math"
    "packages/media"
    "packages/tabbable"
    "packages/tag"
    "packages/toc"
    "packages/yjs"
    "packages/playwright"
    "packages/test-utils"

    # Umbrella (depends on core, slate, utils)
    "packages/plate"
)

$npmrcPath = Join-Path $ROOT ".npmrc"
$npmrcBackup = $null

try {
    # Back up existing .npmrc
    if (Test-Path $npmrcPath) {
        $npmrcBackup = Get-Content $npmrcPath -Raw
    }

    # Write auth .npmrc
    @"
//registry.npmjs.org/:_authToken=$Token
access=public
"@ | Set-Content $npmrcPath -NoNewline

    Write-Host "`n=== npm whoami ===" -ForegroundColor Cyan
    $whoami = npm whoami 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm auth failed. Check your token." -ForegroundColor Red
        exit 1
    }
    Write-Host "Logged in as: $whoami" -ForegroundColor Green

    # Build
    if (-not $SkipBuild) {
        Write-Host "`n=== Building all packages ===" -ForegroundColor Cyan
        Push-Location $ROOT
        pnpm turbo build --filter "./packages/**"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed!" -ForegroundColor Red
            exit 1
        }
        Pop-Location
    }

    # Publish
    $succeeded = @()
    $skipped = @()
    $failed = @()

    foreach ($pkg in $packages) {
        $pkgDir = Join-Path $ROOT $pkg
        $pkgJson = Get-Content (Join-Path $pkgDir "package.json") -Raw | ConvertFrom-Json

        if ($pkgJson.private) {
            Write-Host "  SKIP (private): $($pkgJson.name)" -ForegroundColor DarkGray
            $skipped += $pkgJson.name
            continue
        }

        $name = $pkgJson.name
        $version = $pkgJson.version

        # Check if already published (E404 is expected for new packages)
        $existingOutput = & npm view "$name@$version" version 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $existingOutput.Trim() -eq $version) {
            Write-Host "  SKIP (already published): $name@$version" -ForegroundColor Yellow
            $skipped += $name
            continue
        }

        Write-Host "`n  Publishing $name@$version..." -ForegroundColor Cyan
        Push-Location $pkgDir
        pnpm publish --access public --no-git-checks
        $exitCode = $LASTEXITCODE
        Pop-Location

        if ($exitCode -eq 0) {
            Write-Host "  OK: $name@$version" -ForegroundColor Green
            $succeeded += $name
        } else {
            Write-Host "  FAIL: $name@$version" -ForegroundColor Red
            Write-Host "  Press Enter to retry, or type 'skip' to skip this package:" -ForegroundColor Yellow
            $response = Read-Host
            if ($response -ne 'skip') {
                Push-Location $pkgDir
                pnpm publish --access public --no-git-checks
                $retryCode = $LASTEXITCODE
                Pop-Location
                if ($retryCode -eq 0) {
                    Write-Host "  OK (retry): $name@$version" -ForegroundColor Green
                    $succeeded += $name
                } else {
                    Write-Host "  FAIL (retry): $name@$version" -ForegroundColor Red
                    $failed += $name
                }
            } else {
                $failed += $name
            }
        }
    }

    # Summary
    Write-Host "`n=== Summary ===" -ForegroundColor Cyan
    Write-Host "  Succeeded: $($succeeded.Count)" -ForegroundColor Green
    Write-Host "  Skipped:   $($skipped.Count)" -ForegroundColor Yellow
    Write-Host "  Failed:    $($failed.Count)" -ForegroundColor $(if ($failed.Count -gt 0) { "Red" } else { "Green" })

    if ($failed.Count -gt 0) {
        Write-Host "`nFailed packages:" -ForegroundColor Red
        $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }

} finally {
    # Restore original .npmrc
    if ($null -ne $npmrcBackup) {
        Set-Content $npmrcPath -Value $npmrcBackup -NoNewline
    } elseif (Test-Path $npmrcPath) {
        Remove-Item $npmrcPath
    }
}
