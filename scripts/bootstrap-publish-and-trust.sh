#!/usr/bin/env bash
# Run in your terminal: bash scripts/bootstrap-publish-and-trust.sh
# npm login and trust may open a browser for your 2FA confirmation.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=false
SKIP_BUILD=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --help|-h)
      echo "Usage: bash scripts/bootstrap-publish-and-trust.sh [--dry-run] [--skip-build]"
      echo "Publish table, csv, list-classic and test-utils, then trust lofcz/plate release.yml."
      echo "Requires Node, pnpm, npm >= 11.15 and an interactive terminal for npm browser/2FA."
      echo "Published versions and matching trust are skipped. --skip-build uses existing build output."
      exit 0
      ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

# Validate every target before building, authenticating or publishing anything.
VERSIONS=()
for name in table csv list-classic test-utils; do
  VERSIONS+=("$(node -e '
    const p = require(process.argv[1]);
    if (p.private || p.name !== `@lofcz/platejs-${process.argv[2]}` || !p.version) {
      throw new Error(`Unexpected publish target: ${process.argv[1]}`);
    }
    process.stdout.write(p.version);
  ' "$ROOT_DIR/packages/$name/package.json" "$name")")
done

if ! "$DRY_RUN"; then
  if [[ ! -t 0 || ! -t 1 ]]; then
    echo "Run this script in your terminal so you can complete npm browser/2FA prompts." >&2
    exit 1
  fi
  NPM_VERSION="$(npm --version)"
  node -e '
    const [major, minor] = process.argv[1].split(".").map(Number);
    if (!(major > 11 || (major === 11 && minor >= 15))) {
      console.error("npm >= 11.15 required for npm trust. Update npm, then rerun.");
      process.exit(1);
    }
  ' "$NPM_VERSION"
  # Use your interactive npm session rather than a token supplied by the shell.
  unset NPM_TOKEN NODE_AUTH_TOKEN
fi

if ! "$SKIP_BUILD"; then
  echo "+ pnpm build"
  if ! "$DRY_RUN"; then pnpm build; fi
fi
echo "+ npm login --auth-type=web --registry=https://registry.npmjs.org"
if ! "$DRY_RUN"; then
  npm login --auth-type=web --registry=https://registry.npmjs.org
fi

if ! "$DRY_RUN"; then
  TRUST_OUTPUT="$(mktemp)"
  trap 'rm -f "$TRUST_OUTPUT"' EXIT
fi

index=0
for name in table csv list-classic test-utils; do
  pkg="@lofcz/platejs-$name"
  version="${VERSIONS[$index]}"
  index=$((index + 1))
  echo
  echo "=== $pkg@$version ==="
  if "$DRY_RUN"; then
    echo "+ Check npm for $pkg@$version; publish only if missing:"
    echo "  pnpm --filter $pkg publish --access public --no-git-checks --registry=https://registry.npmjs.org"
  elif published="$(npm view "$pkg@$version" version --json --registry=https://registry.npmjs.org 2>&1)"; then
    echo "Already published; skipping publication."
  elif [[ "$published" == *E404* ]]; then
    pnpm --filter "$pkg" publish --access public --no-git-checks --registry=https://registry.npmjs.org
  else
    echo "$published" >&2
    echo "Registry lookup failed; stopping without publishing $pkg." >&2
    exit 1
  fi
  if ! "$DRY_RUN"; then
    # Keep 2FA URLs visible while inspecting npm's JSON output. npm prints
    # multiple configurations as JSON objects separated by blank lines.
    npm trust list "$pkg" --json --registry=https://registry.npmjs.org | tee "$TRUST_OUTPUT"
    if node - "$TRUST_OUTPUT" <<'NODE'
const fs = require('node:fs');
try {
  const configs = fs.readFileSync(process.argv[2], 'utf8').trim()
    .split(/\r?\n\s*\r?\n/).filter(Boolean).flatMap(value => JSON.parse(value));
  process.exit(configs.some(config => config.type === 'github'
    && config.repository === 'lofcz/plate' && config.file === 'release.yml'
    && !config.environment && config.permissions?.includes('createPackage')) ? 0 : 1);
} catch (error) {
  console.error('Could not inspect npm trust configuration:', error.message);
  process.exit(2);
}
NODE
    then
      echo "Matching trusted publisher already allows publishing; skipping trust creation."
      continue
    else
      trust_status=$?
      if [[ "$trust_status" -ne 1 ]]; then exit "$trust_status"; fi
    fi
  fi
  echo "+ npm trust github $pkg --repo lofcz/plate --file release.yml --allow-publish --yes"
  if ! "$DRY_RUN"; then
    npm trust github "$pkg" --repo lofcz/plate --file release.yml --allow-publish --yes --registry=https://registry.npmjs.org
  fi
done

echo
if "$DRY_RUN"; then
  echo "Dry run complete. No npm authentication, publication or trust changes made."
else
  echo "Done. All four package versions exist and trusted-publisher commands succeeded."
fi
