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

  // Extract range specifier: workspace:^ → ^, workspace:* → *, workspace:>=1.0.0 → >=1.0.0
  const range = depValue.slice('workspace:'.length);
  // Already has an alias (workspace:@lofcz/foo@*)
  if (range.includes('@lofcz/')) return depValue;

  return `workspace:${newName}@${range}`;
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

console.log('\nUpdating root package.json workspace deps...');
const rootPkgPath = join(ROOT, 'package.json');
const rootRaw = readFileSync(rootPkgPath, 'utf-8');
const rootPkg = JSON.parse(rootRaw);
if (rootPkg.dependencies) rootPkg.dependencies = updateDepsSection(rootPkg.dependencies);
if (rootPkg.devDependencies) rootPkg.devDependencies = updateDepsSection(rootPkg.devDependencies);
writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n');
console.log('  ROOT: updated');

console.log('\nDone! All packages renamed to @lofcz/ scope.');
