import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

function mapName(original) {
  if (original === '@plate/scripts') return null; // private, skip
  if (original.startsWith('@lofcz/')) return original; // already renamed
  if (original.startsWith('@platejs/')) return `@lofcz/platejs-${original.slice('@platejs/'.length)}`;
  if (original === 'platejs') return '@lofcz/platejs';
  if (original.startsWith('@udecode/')) return `@lofcz/udecode-${original.slice('@udecode/'.length)}`;
  if (original === 'depset') return '@lofcz/depset';
  return null;
}

function updateWorkspaceDep(depName, depValue) {
  if (!depValue.startsWith('workspace:')) return depValue;
  const newName = mapName(depName);
  if (!newName || newName === depName) return depValue;

  const rest = depValue.slice('workspace:'.length);

  // Already aliased — normalize range to @*
  if (rest.includes('@lofcz/')) {
    return rest.replace(/@[^@]*$/, '@*').replace(/^/, 'workspace:');
  }

  return `workspace:${newName}@*`;
}

function updateDepsSection(deps) {
  if (!deps) return deps;
  const updated = {};
  for (const [key, value] of Object.entries(deps)) {
    updated[key] = updateWorkspaceDep(key, value);
  }
  return updated;
}

function processPackageJson(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  const pkg = JSON.parse(raw);

  if (pkg.private) {
    console.log(`  SKIP (private): ${pkg.name}`);
    return;
  }

  const newName = mapName(pkg.name);
  if (!newName) {
    console.log(`  SKIP (no mapping): ${pkg.name}`);
    return;
  }

  const changed = newName !== pkg.name;
  pkg.name = newName;

  if (pkg.dependencies) pkg.dependencies = updateDepsSection(pkg.dependencies);
  if (pkg.devDependencies) pkg.devDependencies = updateDepsSection(pkg.devDependencies);

  if (!pkg.publishConfig) pkg.publishConfig = {};
  pkg.publishConfig.access = 'public';

  if (pkg.repository?.url?.includes('udecode/plate')) {
    pkg.repository.url = pkg.repository.url.replace('udecode/plate', 'lofcz/plate');
  }

  writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ${changed ? 'RENAMED' : 'UPDATED'}: ${newName}`);
}

function findPackageJsons(dir, depth = 0) {
  const results = [];
  if (depth > 2) return results;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findPackageJsons(full, depth + 1));
    } else if (entry === 'package.json' && depth > 0) {
      results.push(full);
    }
  }
  return results;
}

console.log('Renaming packages under packages/...');
const packageJsons = findPackageJsons(join(ROOT, 'packages'));
for (const pj of packageJsons) {
  processPackageJson(pj);
}

for (const extra of ['package.json', 'apps/www/package.json']) {
  const filePath = join(ROOT, extra);
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const pkg = JSON.parse(raw);
    if (pkg.dependencies) pkg.dependencies = updateDepsSection(pkg.dependencies);
    if (pkg.devDependencies) pkg.devDependencies = updateDepsSection(pkg.devDependencies);
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`\n  UPDATED: ${extra}`);
  } catch { /* file may not exist */ }
}

console.log('\nDone! All packages renamed to @lofcz/ scope.');
